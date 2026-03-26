"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloorPlanCanvas } from "./floor-plan-canvas";
import { TaskDetailSidebar } from "./task-detail-sidebar";
import { ZoneDetailSidebar } from "./zone-detail-sidebar";
import { saveFloorPlanAction } from "@/features/floor-plan/actions";
import { Button } from "@/components/ui/button";
import type {
  FloorArrow,
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
  const [arrows, setArrows] = useState<FloorArrow[]>(floorPlan?.arrows ?? []);
  const [imageData, setImageData] = useState<string | null>(
    floorPlan?.imageData ?? null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);
  const [previousZone, setPreviousZone] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedZone = zones.find((z) => z.name === selectedZoneName) ?? null;

  const zoneTasks = useMemo(() => {
    if (!selectedZoneName) return [];
    return tasks.filter((t) => t.zoneName === selectedZoneName);
  }, [tasks, selectedZoneName]);

  const handleZonesChange = useCallback(
    (newZones: FloorZone[]) => {
      setZones(newZones);
      setDirty(true);
    },
    [],
  );

  const handleArrowsChange = useCallback(
    (newArrows: FloorArrow[]) => {
      setArrows(newArrows);
      setDirty(true);
    },
    [],
  );

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
    if (selectedZoneName) {
      setPreviousZone(selectedZoneName);
    }
    setSelectedZoneName(null);
    setSelectedTaskId(taskId);
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

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-navy-border">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {zones.length} zone{zones.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Click a zone to manage · Click a task dot for details
          </span>

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
            arrows={arrows}
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            selectedZoneName={selectedZoneName}
            onZonesChange={handleZonesChange}
            onArrowsChange={handleArrowsChange}
            onTaskClick={handleTaskClick}
            onZoneClick={handleZoneClick}
            onImageUpload={handleImageUpload}
          />
        </div>
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
              onBack={previousZone ? handleBackToZone : undefined}
              onClose={handleCloseSidebar}
            />
          ) : selectedZone ? (
            <ZoneDetailSidebar
              zone={selectedZone}
              warehouseId={warehouseId}
              tasks={zoneTasks}
              allTasks={tasks}
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
  );
}
