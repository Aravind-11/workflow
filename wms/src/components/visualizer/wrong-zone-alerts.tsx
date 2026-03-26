"use client";

import type { WrongZoneAlert } from "@/features/floor-plan/types";

type Props = {
  alerts: WrongZoneAlert[];
  onAlertClick: (taskId: string) => void;
};

export function WrongZoneAlerts({ alerts, onAlertClick }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {alerts.map((a) => (
        <button
          key={a.taskId}
          type="button"
          className="flex w-full items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/15"
          onClick={() => onAlertClick(a.taskId)}
        >
          <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
          <span className="min-w-0 flex-1 text-red-800 dark:text-red-300">
            <span className="font-medium">{a.taskTitle}</span> is in{" "}
            <span className="font-semibold">{a.actualZone}</span> but expected
            in <span className="font-semibold">{a.expectedZone}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
