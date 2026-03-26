"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloorPlanCanvas } from "./floor-plan-canvas";
import { TaskDetailSidebar } from "./task-detail-sidebar";
import { saveFloorPlanAction } from "@/features/floor-plan/actions";
import { Button } from "@/components/ui/button";
import type {
  FloorPlanData,
  FloorZone,
  TaskLogEntry,
  TaskOnMap,
} from "@/features/floor-plan/types";

type Props = {
  warehouseId: string;
  floorPlan: FloorPlanData | null;
  tasks: TaskOnMap[];
  taskLogs: Record<string, TaskLogEntry[]>;
  workers: { id: string; name: string }[];
};

const selectCls =
  "rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200";

export function TaskVisualizer({
  warehouseId,
  floorPlan,
  tasks,
  taskLogs,
  workers,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [zones, setZones] = useState<FloorZone[]>(floorPlan?.zones ?? []);
  const [imageData, setImageData] = useState<string | null>(
    floorPlan?.imageData ?? null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "filtered">("all");
  const [filterZone, setFilterZone] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const taskTypes = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.taskType))).sort(),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    if (viewMode === "all") return tasks;
    return tasks.filter((t) => {
      if (filterZone && (t.zoneName ?? "") !== filterZone) return false;
      if (filterType && t.taskType !== filterType) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, viewMode, filterZone, filterType, filterStatus]);

  const handleZonesChange = useCallback(
    (newZones: FloorZone[]) => {
      setZones(newZones);
      setDirty(true);
    },
    [],
  );

  const handleImageUpload = useCallback((base64: string) => {
    setImageData(base64);
    setDirty(true);
  }, []);

  function saveFloorPlan() {
    setSaveMsg(null);
    startTransition(async () => {
      const r = await saveFloorPlanAction({
        warehouseId,
        imageData,
        zones,
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

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-navy-border">
          <div className="flex rounded-lg border border-slate-200 text-xs dark:border-navy-border">
            <button
              type="button"
              className={`px-3 py-1.5 font-medium transition ${
                viewMode === "all"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5"
              } rounded-l-lg`}
              onClick={() => setViewMode("all")}
            >
              All tasks
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 font-medium transition ${
                viewMode === "filtered"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/5"
              } rounded-r-lg`}
              onClick={() => setViewMode("filtered")}
            >
              Filter
            </button>
          </div>

          {viewMode === "filtered" && (
            <>
              <select
                className={selectCls}
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
              >
                <option value="">All zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.name}>
                    {z.name}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {taskTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {filteredTasks.length}/{tasks.length} shown
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
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

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4">
          <FloorPlanCanvas
            imageData={imageData}
            zones={zones}
            tasks={filteredTasks}
            selectedTaskId={selectedTaskId}
            onZonesChange={handleZonesChange}
            onTaskClick={setSelectedTaskId}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>

      {/* Sidebar */}
      {selectedTask && (
        <div className="w-80 shrink-0 lg:w-96">
          <TaskDetailSidebar
            task={selectedTask}
            logs={taskLogs[selectedTask.id] ?? []}
            zones={zones}
            workers={workers}
            onClose={() => setSelectedTaskId(null)}
          />
        </div>
      )}
    </div>
  );
}
