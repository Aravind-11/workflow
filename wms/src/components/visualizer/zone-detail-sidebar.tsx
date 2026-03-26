"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  assignTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
  updateTaskZoneAction,
} from "@/features/floor-plan/actions";
import { createTaskAction } from "@/features/tasks/actions";
import type { FloorZone, TaskLogEntry, TaskOnMap } from "@/features/floor-plan/types";

type Props = {
  zone: FloorZone;
  warehouseId: string;
  tasks: TaskOnMap[];
  allTasks: TaskOnMap[];
  taskLogs: Record<string, TaskLogEntry[]>;
  workers: { id: string; name: string }[];
  zones: FloorZone[];
  onTaskSelect: (taskId: string) => void;
  onClose: () => void;
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const TASK_TYPES: TaskType[] = [
  "RECEIPT", "PUTAWAY", "PICK", "PACK", "SHIPMENT", "RETURN", "CYCLE_COUNT", "MAINTENANCE",
];

const selectCls =
  "w-full rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200";
const inputCls =
  "w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200";

export function ZoneDetailSidebar({
  zone,
  warehouseId,
  tasks,
  allTasks,
  taskLogs,
  workers,
  onTaskSelect,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>("PUTAWAY");
  const [newPriority, setNewPriority] = useState(3);

  const openCount = tasks.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const unzonedTasks = allTasks.filter((t) => !t.zoneName || t.zoneName !== zone.name);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) console.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-navy-border dark:bg-navy-surface">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-navy-border">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded"
              style={{ backgroundColor: zone.color }}
            />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
              {zone.name}
            </h3>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-gray-300">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
            {openCount > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-500/15 dark:text-green-300">
                {openCount} open
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                {inProgressCount} in progress
              </span>
            )}
          </div>

        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Add task to zone */}
      <div className="border-b border-slate-200 p-3 dark:border-navy-border">
        <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Add task to this zone
        </label>
        <select
          className={selectCls + " mt-1"}
          disabled={isPending || unzonedTasks.length === 0}
          defaultValue=""
          onChange={(e) => {
            const taskId = e.target.value;
            if (taskId) {
              act(() => updateTaskZoneAction({ taskId, zoneName: zone.name }));
            }
            e.target.value = "";
          }}
        >
          <option value="">
            {unzonedTasks.length === 0 ? "No available tasks" : "Select a task…"}
          </option>
          {unzonedTasks.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.taskType.replace(/_/g, " ")}] {t.title}
              {t.zoneName ? ` (in ${t.zoneName})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Create new task */}
      <div className="border-b border-slate-200 p-3 dark:border-navy-border">
        {!showCreate ? (
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => setShowCreate(true)}
          >
            + Create task in this zone
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              New task in {zone.name}
            </p>
            <input
              className={inputCls}
              placeholder="Task title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className={selectCls}
                value={newType}
                onChange={(e) => setNewType(e.target.value as TaskType)}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    Priority {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                disabled={!newTitle.trim() || isPending}
                onClick={() => {
                  const title = newTitle.trim();
                  setNewTitle("");
                  setShowCreate(false);
                  startTransition(async () => {
                    const r = await createTaskAction({
                      warehouseId,
                      title,
                      taskType: newType,
                      priority: newPriority,
                    });
                    if (r.ok && r.data?.id) {
                      await updateTaskZoneAction({
                        taskId: r.data.id,
                        zoneName: zone.name,
                      });
                    }
                    router.refresh();
                  });
                }}
              >
                Create
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
            No tasks in this zone yet. Add existing tasks above or create a new one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-border">
            {tasks.map((task) => {
              const logs = taskLogs[task.id] ?? [];
              const lastLog = logs[0];
              return (
                <div key={task.id} className="space-y-2 p-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left text-xs font-medium text-slate-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
                      onClick={() => onTaskSelect(task.id)}
                    >
                      {task.title}
                    </button>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
                      P{task.priority}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {task.taskType.replace(/_/g, " ")}
                    {task.dueDate && (
                      <> · Due {new Date(task.dueDate).toLocaleDateString()}</>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Status
                    </label>
                    <select
                      className={selectCls}
                      value={task.status}
                      disabled={isPending}
                      onChange={(e) =>
                        act(() =>
                          updateTaskStatusAction({
                            taskId: task.id,
                            status: e.target.value,
                          }),
                        )
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignment */}
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Assign
                    </label>
                    <div className="flex flex-1 items-center gap-1">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          task.assigneeType === "ROBOT"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300"
                            : task.assigneeName
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                        }`}
                      >
                        {task.assigneeType === "ROBOT"
                          ? "Robot"
                          : task.assigneeName ?? "None"}
                      </span>
                      <select
                        className={selectCls + " flex-1"}
                        disabled={isPending}
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "ROBOT") {
                            act(() =>
                              assignTaskAction({
                                taskId: task.id,
                                assigneeType: "ROBOT",
                                workerProfileId: null,
                              }),
                            );
                          } else if (val === "UNASSIGN") {
                            act(() =>
                              assignTaskAction({
                                taskId: task.id,
                                assigneeType: null,
                                workerProfileId: null,
                              }),
                            );
                          } else if (val) {
                            act(() =>
                              assignTaskAction({
                                taskId: task.id,
                                assigneeType: "HUMAN",
                                workerProfileId: val,
                              }),
                            );
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="">Change…</option>
                        <option value="ROBOT">Robot</option>
                        <option value="UNASSIGN">Unassign</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Last activity */}
                  {lastLog && (
                    <div className="rounded border border-slate-100 bg-slate-50 p-1.5 dark:border-navy-border dark:bg-navy">
                      <div className="flex items-center gap-1">
                        <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${logBadge(lastLog.action)}`}>
                          {lastLog.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          {new Date(lastLog.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {lastLog.message}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => onTaskSelect(task.id)}
                    >
                      View full details →
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-medium text-red-500 hover:underline dark:text-red-400"
                      disabled={isPending}
                      onClick={() => {
                        if (confirm("Delete this task? This cannot be undone.")) {
                          act(() => deleteTaskAction({ taskId: task.id }));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function logBadge(action: string): string {
  switch (action) {
    case "TICKET":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
    case "STATUS_CHANGE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300";
    case "ZONE_CHANGE":
      return "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300";
    case "ASSIGNMENT":
      return "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
  }
}
