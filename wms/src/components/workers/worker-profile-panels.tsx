"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleConfirmation, ScheduleStatus, TimeOffStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import {
  clockInAction,
  clockOutAction,
  requestTimeOffAction,
  setBreakMinutesAction,
  updateScheduleAction,
  updateTimeOffStatusAction,
} from "@/features/workers/actions";

type Sched = {
  id: string;
  status: ScheduleStatus;
  confirmationStatus: ScheduleConfirmation;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  breakMinutes: number;
  totalWorkedMinutes: number | null;
  shift: { name: string; startTime: string; endTime: string };
  warehouse: { code: string };
  location: { locationCode: string } | null;
};

type TOff = {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  status: TimeOffStatus;
};

export function WorkerProfilePanels({
  workerId,
  warehouseId,
  todaySchedules,
  timeOff,
}: {
  workerId: string;
  warehouseId: string;
  todaySchedules: Sched[];
  timeOff: TOff[];
}) {
  const router = useRouter();
  const [breakOpen, setBreakOpen] = useState<string | null>(null);
  const [breakVal, setBreakVal] = useState(0);
  const [toOpen, setToOpen] = useState(false);
  const [toForm, setToForm] = useState({ start: "", end: "", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function onClockIn(id: string) {
    setMsg(null);
    const r = await clockInAction({ scheduleId: id });
    if (!r.ok) setMsg(r.error);
    router.refresh();
  }

  async function onClockOut(id: string) {
    setMsg(null);
    const r = await clockOutAction({ scheduleId: id });
    if (!r.ok) setMsg(r.error);
    router.refresh();
  }

  async function onSaveBreak(scheduleId: string) {
    setMsg(null);
    const r = await setBreakMinutesAction({ scheduleId, breakMinutes: breakVal });
    if (!r.ok) setMsg(r.error);
    setBreakOpen(null);
    router.refresh();
  }

  async function toggleConfirm(s: Sched) {
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
    router.refresh();
  }

  async function submitTimeOff() {
    setMsg(null);
    const r = await requestTimeOffAction({
      workerProfileId: workerId,
      warehouseId,
      startAt: toForm.start,
      endAt: toForm.end,
      reason: toForm.reason || null,
    });
    if (!r.ok) setMsg(r.error);
    else {
      setToOpen(false);
      setToForm({ start: "", end: "", reason: "" });
      router.refresh();
    }
  }

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-gray-900">Today&apos;s shift &amp; time</h3>
        {msg ? <p className="mb-2 text-sm text-red-700">{msg}</p> : null}
        {todaySchedules.length === 0 ? (
          <p className="text-sm text-gray-500">No shift scheduled for today.</p>
        ) : (
          <ul className="space-y-3">
            {todaySchedules.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{s.shift.name}</div>
                    <div className="text-xs text-gray-500">
                      {s.warehouse.code}
                      {s.location ? ` · ${s.location.locationCode}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Planned:{" "}
                      {s.plannedStart && s.plannedEnd
                        ? `${new Date(s.plannedStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(s.plannedEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "—"}
                    </div>
                    <div className="mt-1 text-xs">
                      <span
                        className={
                          s.confirmationStatus === ScheduleConfirmation.CONFIRMED
                            ? "text-green-700"
                            : "text-amber-700"
                        }
                      >
                        {s.confirmationStatus}
                      </span>
                      {" · "}
                      <span className="text-gray-600">{s.status.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => toggleConfirm(s)}>
                      Toggle confirm
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setBreakOpen(s.id);
                        setBreakVal(s.breakMinutes ?? 0);
                      }}
                    >
                      Break ({s.breakMinutes}m)
                    </Button>
                    {s.status === ScheduleStatus.CLOCKED_OUT || s.actualEnd ? (
                      <span className="text-xs text-gray-500">Shift closed</span>
                    ) : s.actualStart ? (
                      <Button type="button" size="sm" onClick={() => onClockOut(s.id)}>
                        Clock out
                      </Button>
                    ) : (
                      <Button type="button" size="sm" onClick={() => onClockIn(s.id)}>
                        Clock in
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  In: {s.actualStart ? new Date(s.actualStart).toLocaleString() : "—"} · Out:{" "}
                  {s.actualEnd ? new Date(s.actualEnd).toLocaleString() : "—"}
                  {s.totalWorkedMinutes != null ? (
                    <> · Worked: {s.totalWorkedMinutes} min (incl. break deduction)</>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-medium text-gray-900">Time off</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setToOpen(true)}>
            Request time off
          </Button>
        </div>
        {timeOff.length === 0 ? (
          <p className="text-sm text-gray-500">No time-off records.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {timeOff.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div>
                  <div>
                    {new Date(t.startAt).toLocaleString()} → {new Date(t.endAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">{t.reason ?? "—"} · {t.status}</div>
                </div>
                {t.status === TimeOffStatus.REQUESTED ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await updateTimeOffStatusAction({ id: t.id, status: TimeOffStatus.APPROVED });
                        router.refresh();
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await updateTimeOffStatusAction({ id: t.id, status: TimeOffStatus.DENIED });
                        router.refresh();
                      }}
                    >
                      Deny
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!breakOpen} title="Break minutes" onClose={() => setBreakOpen(null)}>
        <div className="space-y-3">
          <input
            type="number"
            min={0}
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={breakVal}
            onChange={(e) => setBreakVal(parseInt(e.target.value, 10) || 0)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBreakOpen(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => breakOpen && onSaveBreak(breakOpen)}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={toOpen} title="Request time off" onClose={() => setToOpen(false)}>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-gray-600">Start</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={toForm.start}
              onChange={(e) => setToForm((f) => ({ ...f, start: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-gray-600">End</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={toForm.end}
              onChange={(e) => setToForm((f) => ({ ...f, end: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-gray-600">Reason</span>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2"
              rows={2}
              value={toForm.reason}
              onChange={(e) => setToForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setToOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitTimeOff}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
