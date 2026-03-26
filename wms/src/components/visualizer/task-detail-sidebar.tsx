"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  addTaskLogAction,
  assignTaskAction,
  raiseTicketAction,
  updateTaskStatusAction,
  updateTaskZoneAction,
} from "@/features/floor-plan/actions";
import type { FloorZone, TaskLogEntry, TaskOnMap } from "@/features/floor-plan/types";

type Props = {
  task: TaskOnMap;
  logs: TaskLogEntry[];
  zones: FloorZone[];
  workers: { id: string; name: string }[];
  onBack?: () => void;
  onClose: () => void;
};

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const TICKET_REASONS = [
  { value: "BLOCKED", label: "Blocked" },
  { value: "NEEDS_HUMAN", label: "Needs human intervention" },
  { value: "NEEDS_TELEOPS", label: "Needs tele-ops assistance" },
  { value: "OTHER", label: "Other" },
] as const;

const inputCls =
  "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200";

export function TaskDetailSidebar({ task, logs, zones, workers, onBack, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [ticketReason, setTicketReason] = useState<string>("BLOCKED");
  const [ticketDetails, setTicketDetails] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Action failed");
      else router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-navy-border dark:bg-navy-surface">
      {/* Header */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center gap-1 border-b border-slate-200 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-slate-50 dark:border-navy-border dark:text-blue-400 dark:hover:bg-white/5"
        >
          ← Back to zone
        </button>
      )}
      <div className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-navy-border">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-gray-100">
            {task.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {task.taskType.replace(/_/g, " ")} · Priority {task.priority}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {msg && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {msg}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Status */}
        <section>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Status
          </label>
          <select
            className={inputCls + " mt-1"}
            value={task.status}
            disabled={isPending}
            onChange={(e) =>
              act(() => updateTaskStatusAction({ taskId: task.id, status: e.target.value }))
            }
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </section>

        {/* Assignment */}
        <section>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Assigned to
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                task.assigneeType === "ROBOT"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300"
                  : task.assigneeName
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                    : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
              }`}
            >
              {task.assigneeType === "ROBOT"
                ? "Robot"
                : task.assigneeName ?? "Unassigned"}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            <select
              className={inputCls + " flex-1"}
              disabled={isPending}
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (val === "ROBOT") {
                  act(() =>
                    assignTaskAction({ taskId: task.id, assigneeType: "ROBOT", workerProfileId: null }),
                  );
                } else if (val === "UNASSIGN") {
                  act(() =>
                    assignTaskAction({ taskId: task.id, assigneeType: null, workerProfileId: null }),
                  );
                } else if (val) {
                  act(() =>
                    assignTaskAction({ taskId: task.id, assigneeType: "HUMAN", workerProfileId: val }),
                  );
                }
                e.target.value = "";
              }}
            >
              <option value="">Reassign…</option>
              <option value="ROBOT">Robot</option>
              <option value="UNASSIGN">Unassign</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Zone */}
        <section>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Zone
          </label>
          <select
            className={inputCls + " mt-1"}
            value={task.zoneName ?? ""}
            disabled={isPending}
            onChange={(e) =>
              act(() =>
                updateTaskZoneAction({ taskId: task.id, zoneName: e.target.value || null }),
              )
            }
          >
            <option value="">No zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </section>

        {/* Info */}
        <section className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
          {task.locationCode && (
            <p>
              <span className="font-medium text-slate-700 dark:text-gray-300">Location:</span>{" "}
              {task.locationCode}
            </p>
          )}
          {task.dueDate && (
            <p>
              <span className="font-medium text-slate-700 dark:text-gray-300">Due:</span>{" "}
              {new Date(task.dueDate).toLocaleString()}
            </p>
          )}
          <p>
            <span className="font-medium text-slate-700 dark:text-gray-300">Created:</span>{" "}
            {new Date(task.createdAt).toLocaleString()}
          </p>
        </section>

        {/* Add note */}
        <section>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Add note
          </label>
          <div className="mt-1 flex gap-1">
            <input
              className={inputCls + " flex-1"}
              placeholder="Type a note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              disabled={!note.trim() || isPending}
              onClick={() => {
                const msg = note.trim();
                setNote("");
                act(() => addTaskLogAction({ taskId: task.id, message: msg }));
              }}
            >
              Add
            </Button>
          </div>
        </section>

        {/* Raise ticket */}
        <section>
          {!showTicketForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
              onClick={() => setShowTicketForm(true)}
            >
              Raise ticket
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Raise a ticket
              </p>
              <select
                className={inputCls}
                value={ticketReason}
                onChange={(e) => setTicketReason(e.target.value)}
              >
                {TICKET_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder="Additional details (optional)"
                value={ticketDetails}
                onChange={(e) => setTicketDetails(e.target.value)}
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const d = ticketDetails.trim();
                    setShowTicketForm(false);
                    setTicketDetails("");
                    act(() =>
                      raiseTicketAction({
                        taskId: task.id,
                        reason: ticketReason,
                        details: d || undefined,
                      }),
                    );
                  }}
                >
                  Submit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowTicketForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Task log */}
        <section>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-300">
            Activity log
          </h4>
          <div className="mt-2 space-y-2">
            {logs.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">No activity yet.</p>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-100 p-2 dark:border-navy-border"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${logBadge(log.action)}`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{log.message}</p>
              </div>
            ))}
          </div>
        </section>
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
