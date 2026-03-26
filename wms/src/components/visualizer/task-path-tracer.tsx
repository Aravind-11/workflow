"use client";

import { useMemo, useState } from "react";
import type { TaskLogEntry } from "@/features/floor-plan/types";

type PathStep = {
  zoneName: string;
  enteredAt: string;
  leftAt: string | null;
};

type Props = {
  logs: TaskLogEntry[];
  expectedRoute: string[] | null;
  showOnMap: boolean;
  onToggleShowOnMap: (v: boolean) => void;
};

export function TaskPathTracer({
  logs,
  expectedRoute,
  showOnMap,
  onToggleShowOnMap,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const path = useMemo(() => {
    const zoneChanges = logs
      .filter((l) => l.action === "ZONE_CHANGE" && l.zoneName)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    const steps: PathStep[] = [];
    for (let i = 0; i < zoneChanges.length; i++) {
      const log = zoneChanges[i];
      steps.push({
        zoneName: log.zoneName!,
        enteredAt: log.createdAt,
        leftAt: zoneChanges[i + 1]?.createdAt ?? null,
      });
    }
    return steps;
  }, [logs]);

  const actualPath = path.map((s) => s.zoneName);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-xs font-semibold text-slate-700 dark:text-gray-300"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "▾" : "▸"} Zone path ({path.length} step
          {path.length !== 1 ? "s" : ""})
        </button>
        <label className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={showOnMap}
            onChange={(e) => onToggleShowOnMap(e.target.checked)}
            className="h-3 w-3 rounded"
          />
          Show on map
        </label>
      </div>

      {expanded && (
        <div className="relative ml-2 space-y-0 border-l-2 border-slate-200 pl-4 dark:border-navy-border">
          {path.length === 0 && (
            <p className="py-1 text-[10px] text-slate-400 dark:text-slate-500">
              No zone changes recorded yet.
            </p>
          )}
          {path.map((step, i) => {
            const isDeviation =
              expectedRoute &&
              i < expectedRoute.length &&
              step.zoneName !== expectedRoute[i];
            const duration = step.leftAt
              ? formatDuration(
                  new Date(step.leftAt).getTime() -
                    new Date(step.enteredAt).getTime(),
                )
              : "current";

            return (
              <div key={i} className="relative pb-3">
                <div
                  className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 ${
                    isDeviation
                      ? "border-red-400 bg-red-100 dark:border-red-500 dark:bg-red-500/30"
                      : "border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-500/30"
                  }`}
                />
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {i + 1}.
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          isDeviation
                            ? "text-red-700 dark:text-red-400"
                            : "text-slate-800 dark:text-gray-200"
                        }`}
                      >
                        {step.zoneName}
                      </span>
                      {isDeviation && expectedRoute && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                          expected: {expectedRoute[i]}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(step.enteredAt).toLocaleTimeString()} ·{" "}
                      {duration}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expectedRoute && expectedRoute.length > 0 && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 dark:border-navy-border dark:bg-navy">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Expected route
          </p>
          <p className="mt-0.5 text-[10px] text-slate-700 dark:text-gray-300">
            {expectedRoute.join(" → ")}
          </p>
          {actualPath.length > 0 && (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Actual: {actualPath.join(" → ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
