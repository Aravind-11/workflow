"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloorPlanCanvas } from "./floor-plan-canvas";
import { TaskDetailSidebar } from "./task-detail-sidebar";
import { ZoneDetailSidebar } from "./zone-detail-sidebar";
import { RouteTemplateEditor } from "./route-template-editor";
import { WrongZoneAlerts } from "./wrong-zone-alerts";
import { saveFloorPlanAction } from "@/features/floor-plan/actions";
import { useTaskPoller } from "@/hooks/use-task-poller";
import { useSimulation } from "@/hooks/use-simulation";
import { Button } from "@/components/ui/button";
import type {
  FloorArrow,
  FloorPlanData,
  FloorZone,
  RouteTemplate,
  TaskLogEntry,
  TaskOnMap,
} from "@/features/floor-plan/types";

type ViewMode = "all" | "single";

type Props = {
  warehouseId: string;
  floorPlan: FloorPlanData | null;
  tasks: TaskOnMap[];
  taskLogs: Record<string, TaskLogEntry[]>;
  workers: { id: string; name: string }[];
  routeTemplates: RouteTemplate[];
};

const STATUS_FILTERS = [
  { key: "OPEN", label: "Open", color: "bg-green-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { key: "COMPLETED", label: "Done", color: "bg-gray-400" },
  { key: "CANCELLED", label: "Cancelled", color: "bg-gray-300" },
] as const;

export function TaskVisualizer({
  warehouseId,
  floorPlan,
  tasks: initialTasks,
  taskLogs,
  workers,
  routeTemplates: initialRoutes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [zones, setZones] = useState<FloorZone[]>(floorPlan?.zones ?? []);
  const [arrows, setArrows] = useState<FloorArrow[]>(floorPlan?.arrows ?? []);
  const [imageData, setImageData] = useState<string | null>(
    floorPlan?.imageData ?? null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
  const [previousZone, setPreviousZone] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // View mode and filters
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(
    new Set(["OPEN", "IN_PROGRESS"]),
  );
  const [showRouteEditor, setShowRouteEditor] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showPathOnMap, setShowPathOnMap] = useState(false);

  // Live polling
  const { liveTasks, transitions, alerts } = useTaskPoller(
    warehouseId,
    initialTasks,
    5000,
  );

  // Use routes from initial load (refreshed via router.refresh)
  const routes = initialRoutes;

  // Simulation
  const sim = useSimulation(warehouseId, zones, liveTasks, routes);

  // Status filtered tasks
  const filteredTasks = useMemo(() => {
    return liveTasks.filter((t) => statusFilters.has(t.status));
  }, [liveTasks, statusFilters]);

  // Derived
  const selectedTask =
    filteredTasks.find((t) => t.id === selectedTaskId) ??
    liveTasks.find((t) => t.id === selectedTaskId) ??
    null;
  const selectedZone = zones.find((z) => z.name === selectedZoneName) ?? null;

  const zoneTasks = useMemo(() => {
    if (!selectedZoneName) return [];
    return filteredTasks.filter((t) => t.zoneName === selectedZoneName);
  }, [filteredTasks, selectedZoneName]);

  // Focus task for single-task view mode
  const focusTaskId = viewMode === "single" ? selectedTaskId : null;

  // Highlight path on the map
  const highlightPath = useMemo(() => {
    if (selectedRouteId) {
      const rt = routes.find((r) => r.id === selectedRouteId);
      return rt?.zoneSequence ?? null;
    }
    if (showPathOnMap && selectedTask) {
      const logs = taskLogs[selectedTask.id] ?? [];
      const zoneChanges = logs
        .filter((l) => l.action === "ZONE_CHANGE" && l.zoneName)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((l) => l.zoneName!);
      return zoneChanges.length >= 2 ? zoneChanges : null;
    }
    return null;
  }, [selectedRouteId, showPathOnMap, selectedTask, taskLogs, routes]);

  const handleZonesChange = useCallback((newZones: FloorZone[]) => {
    setZones(newZones);
    setDirty(true);
  }, []);

  const handleArrowsChange = useCallback((newArrows: FloorArrow[]) => {
    setArrows(newArrows);
    setDirty(true);
  }, []);

  const handleImageUpload = useCallback((base64: string) => {
    setImageData(base64);
    setDirty(true);
  }, []);

  function handleZoneClick(zoneName: string) {
    setSelectedTaskId(null);
    setPreviousZone(null);
    setSelectedZoneName(zoneName);
  }

  function handleTaskClick(taskId: string) {
    if (selectedZoneName) setPreviousZone(selectedZoneName);
    setSelectedZoneName(null);
    setSelectedTaskId(taskId);
    if (viewMode === "single") setViewMode("single");
  }

  function handleBackToZone() {
    if (previousZone) {
      setSelectedTaskId(null);
      setSelectedZoneName(previousZone);
      setPreviousZone(null);
    }
  }

  function handleCloseSidebar() {
    setSelectedTaskId(null);
    setSelectedZoneName(null);
    setPreviousZone(null);
    setShowPathOnMap(false);
  }

  function toggleStatus(key: string) {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function saveFloorPlan() {
    setSaveMsg(null);
    startTransition(async () => {
      const r = await saveFloorPlanAction({
        warehouseId,
        imageData,
        zones,
        arrows,
      });
      if (r.ok) {
        setDirty(false);
        setSaveMsg("Saved!");
        setTimeout(() => setSaveMsg(null), 2000);
        router.refresh();
      } else {
        setSaveMsg(r.error ?? "Save failed");
      }
    });
  }

  const sidebarOpen = !!selectedTask || !!selectedZone;

  // Status counts for the filter bar
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of liveTasks) m[t.status] = (m[t.status] ?? 0) + 1;
    return m;
  }, [liveTasks]);

  return (
    <div className="space-y-3">
      {/* Alerts */}
      <WrongZoneAlerts alerts={alerts} onAlertClick={handleTaskClick} />

      <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-navy-border">
            {/* Status filter pills */}
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((sf) => (
                <button
                  key={sf.key}
                  type="button"
                  onClick={() => toggleStatus(sf.key)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                    statusFilters.has(sf.key)
                      ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${sf.color}`} />
                  {sf.label}
                  <span className="opacity-60">
                    {statusCounts[sf.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-slate-300 dark:text-slate-600">|</span>

            {/* View mode */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-navy-border">
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                  viewMode === "all"
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                All tasks
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                  viewMode === "single"
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Single task
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowRouteEditor(!showRouteEditor)}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                showRouteEditor
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/15"
              }`}
            >
              Routes
            </button>

            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Live · polling every 5s
            </span>

            <div className="ml-auto flex items-center gap-2">
              {/* Simulation controls */}
              {sim.simulating ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                  onClick={sim.stop}
                >
                  Stop simulation
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400"
                  disabled={sim.seeding}
                  onClick={() => {
                    setStatusFilters(new Set(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
                    sim.start();
                  }}
                >
                  {sim.seeding ? "Seeding…" : "Simulate"}
                </Button>
              )}

              {saveMsg && (
                <span
                  className={`text-xs font-medium ${
                    saveMsg === "Saved!"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {saveMsg}
                </span>
              )}
              {dirty && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={saveFloorPlan}
                >
                  {isPending ? "Saving…" : "Save floor plan"}
                </Button>
              )}
            </div>
          </div>

          {/* Simulation log */}
          {sim.log.length > 0 && (
            <div className="flex max-h-20 flex-col gap-0.5 overflow-y-auto border-b border-slate-200 bg-slate-50 px-4 py-1.5 dark:border-navy-border dark:bg-navy">
              {sim.log.map((entry) => (
                <p
                  key={entry.ts + entry.msg}
                  className={`text-[10px] ${
                    entry.msg.startsWith("WRONG ZONE")
                      ? "font-medium text-red-600 dark:text-red-400"
                      : entry.msg.startsWith("TICKET")
                        ? "font-medium text-amber-600 dark:text-amber-400"
                        : entry.msg.startsWith("DONE")
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {new Date(entry.ts).toLocaleTimeString()} — {entry.msg}
                </p>
              ))}
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-4">
            <FloorPlanCanvas
              imageData={imageData}
              zones={zones}
              arrows={arrows}
              tasks={filteredTasks}
              transitions={transitions}
              selectedTaskId={selectedTaskId}
              selectedZoneName={selectedZoneName}
              highlightPath={highlightPath}
              focusTaskId={focusTaskId}
              onZonesChange={handleZonesChange}
              onArrowsChange={handleArrowsChange}
              onTaskClick={handleTaskClick}
              onZoneClick={handleZoneClick}
              onImageUpload={handleImageUpload}
            />
          </div>

          {/* Route editor panel */}
          {showRouteEditor && (
            <div className="border-t border-slate-200 p-3 dark:border-navy-border">
              <RouteTemplateEditor
                warehouseId={warehouseId}
                zones={zones}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 shrink-0 lg:w-96">
            {selectedTask ? (
              <TaskDetailSidebar
                task={selectedTask}
                logs={taskLogs[selectedTask.id] ?? []}
                zones={zones}
                workers={workers}
                routes={routes}
                showPathOnMap={showPathOnMap}
                onToggleShowPath={setShowPathOnMap}
                onBack={previousZone ? handleBackToZone : undefined}
                onClose={handleCloseSidebar}
              />
            ) : selectedZone ? (
              <ZoneDetailSidebar
                zone={selectedZone}
                warehouseId={warehouseId}
                tasks={zoneTasks}
                allTasks={filteredTasks}
                taskLogs={taskLogs}
                workers={workers}
                zones={zones}
                onTaskSelect={handleTaskClick}
                onClose={handleCloseSidebar}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Open
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> In Progress
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" /> Done
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Has Ticket
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-transparent" /> Wrong Zone
        </span>
      </div>
    </div>
  );
}
