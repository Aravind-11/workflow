"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleConfirmation } from "@prisma/client";
import { addWeeks, eachDayOfInterval, format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  assignSchedulesAction,
  swapSchedulesAction,
  updateScheduleAction,
} from "@/features/workers/actions";
import type { ShiftRow, WorkerMini, LocMini, SchedRow } from "@/features/workers/types/schedule";
import { AssignWorkersModal } from "./assign-workers-modal";
import { SwapSchedulesModal } from "./swap-schedules-modal";

type Props = {
  warehouseId: string;
  weekStartIso: string;
  weekEndIso: string;
  schedules: SchedRow[];
  shifts: ShiftRow[];
  workers: WorkerMini[];
  locations: LocMini[];
};

export function WeeklyScheduleBoard({
  warehouseId,
  weekStartIso,
  weekEndIso,
  schedules,
  shifts,
  workers,
  locations,
}: Props) {
  const router = useRouter();
  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso]);
  const weekEnd = useMemo(() => new Date(weekEndIso), [weekEndIso]);
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  const [msg, setMsg] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const shiftRows = shifts.length
    ? shifts
    : Array.from(new Map(schedules.map((s) => [s.shift.id, s.shift])).values());

  const cellMap = useMemo(() => {
    const m = new Map<string, Map<number, SchedRow>>();
    for (const s of schedules) {
      const di = days.findIndex((d) => isSameDay(d, new Date(s.scheduleDate)));
      if (di < 0) continue;
      if (!m.has(s.shiftId)) m.set(s.shiftId, new Map());
      m.get(s.shiftId)!.set(di, s);
    }
    return m;
  }, [schedules, days]);

  function prevWeek() {
    const t = addWeeks(weekStart, -1);
    const qs = new URLSearchParams(window.location.search);
    qs.set("week", format(t, "yyyy-MM-dd"));
    qs.set("warehouseId", warehouseId);
    router.push(`/workers/schedules?${qs.toString()}`);
  }

  function nextWeek() {
    const t = addWeeks(weekStart, 1);
    const qs = new URLSearchParams(window.location.search);
    qs.set("week", format(t, "yyyy-MM-dd"));
    qs.set("warehouseId", warehouseId);
    router.push(`/workers/schedules?${qs.toString()}`);
  }

  async function quickConfirm(s: SchedRow) {
    setMsg(null);
    const next =
      s.confirmationStatus === ScheduleConfirmation.CONFIRMED
        ? ScheduleConfirmation.TENTATIVE
        : ScheduleConfirmation.CONFIRMED;
    const r = await updateScheduleAction({
      id: s.id,
      confirmationStatus: next,
    });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {msg}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={prevWeek}>
            ← Prev
          </Button>
          <span className="text-sm font-medium text-gray-800">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={nextWeek}>
            Next →
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
            Assign workers
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSwapOpen(true)}>
            Swap two schedules
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="sticky left-0 z-10 min-w-[140px] border-b border-r bg-gray-50 px-2 py-2">
                Shift
              </th>
              {days.map((d) => (
                <th key={d.toISOString()} className="border-b px-1 py-2 text-center font-medium">
                  <div>{format(d, "EEE")}</div>
                  <div className="text-[10px] text-gray-400">{format(d, "M/d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shiftRows.length === 0 ? (
              <tr>
                <td colSpan={1 + days.length} className="px-4 py-8 text-center text-gray-500">
                  No shift templates for this warehouse. Create one to start scheduling.
                </td>
              </tr>
            ) : (
              shiftRows.map((sh) => (
                <tr key={sh.id} className="border-t">
                  <td className="sticky left-0 z-10 border-r bg-white px-2 py-2 align-top text-gray-800">
                    <div className="font-medium">{sh.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {sh.startTime}–{sh.endTime}
                    </div>
                  </td>
                  {days.map((d, di) => {
                    const s = cellMap.get(sh.id)?.get(di);
                    return (
                      <td key={di} className="border-l px-1 py-1 align-top">
                        {s ? (
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-1.5">
                            <div className="font-medium text-gray-900">
                              {s.workerProfile.firstName[0]}. {s.workerProfile.lastName}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {s.location?.locationCode ?? "Any zone"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span
                                className={
                                  s.confirmationStatus === ScheduleConfirmation.CONFIRMED
                                    ? "rounded bg-green-100 px-1 text-[10px] text-green-800"
                                    : "rounded bg-amber-100 px-1 text-[10px] text-amber-800"
                                }
                              >
                                {s.confirmationStatus === ScheduleConfirmation.CONFIRMED
                                  ? "Confirmed"
                                  : "Tentative"}
                              </span>
                              <button
                                type="button"
                                className="text-[10px] text-blue-700 underline"
                                onClick={() => quickConfirm(s)}
                              >
                                Toggle
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AssignWorkersModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        shifts={shifts}
        workers={workers}
        locations={locations}
        weekStart={weekStart}
        onSubmit={async (form) => {
          setMsg(null);
          const r = await assignSchedulesAction({
            warehouseId,
            shiftId: form.shiftId,
            scheduleDate: form.scheduleDate,
            workerIds: form.workerIds,
            locationId: form.locationId || null,
            confirmationStatus: form.confirmationStatus,
          });
          if (!r.ok) setMsg(r.error);
          else {
            const w = r.data?.warnings?.length
              ? ` Some skipped: ${r.data.warnings.join(" · ")}`
              : "";
            setMsg(`Assigned ${r.data?.created ?? 0} row(s).${w}`);
            setAssignOpen(false);
            router.refresh();
          }
        }}
      />

      <SwapSchedulesModal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        schedules={schedules}
        onSubmit={async (a, b) => {
          setMsg(null);
          const r = await swapSchedulesAction({
            scheduleIdA: a,
            scheduleIdB: b,
          });
          if (!r.ok) setMsg(r.error);
          else {
            setSwapOpen(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
