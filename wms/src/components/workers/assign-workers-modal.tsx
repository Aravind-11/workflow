"use client";

import { useState } from "react";
import { ScheduleConfirmation } from "@prisma/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import type { ShiftRow, WorkerMini, LocMini } from "@/features/workers/types/schedule";

export type AssignForm = {
  shiftId: string;
  scheduleDate: string;
  workerIds: string[];
  locationId: string;
  confirmationStatus: ScheduleConfirmation;
};

export function AssignWorkersModal({
  open,
  onClose,
  shifts,
  workers,
  locations,
  weekStart,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  shifts: ShiftRow[];
  workers: WorkerMini[];
  locations: LocMini[];
  weekStart: Date;
  onSubmit: (form: AssignForm) => void;
}) {
  const [form, setForm] = useState<AssignForm>({
    shiftId: shifts[0]?.id ?? "",
    scheduleDate: format(weekStart, "yyyy-MM-dd"),
    workerIds: [],
    locationId: "",
    confirmationStatus: ScheduleConfirmation.TENTATIVE,
  });

  return (
    <Modal open={open} title="Assign workers to shift" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <label className="block">
          Shift template
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.shiftId}
            onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))}
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Date
          <input
            type="date"
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.scheduleDate}
            onChange={(e) => setForm((f) => ({ ...f, scheduleDate: e.target.value }))}
          />
        </label>
        <label className="block">
          Work location (bin / zone)
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.locationId}
            onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
          >
            <option value="">— Optional —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationCode}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-gray-600">Workers</legend>
          <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded border p-2">
            {workers.map((w) => (
              <label key={w.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.workerIds.includes(w.id)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      workerIds: e.target.checked
                        ? [...f.workerIds, w.id]
                        : f.workerIds.filter((x) => x !== w.id),
                    }));
                  }}
                />
                {w.firstName} {w.lastName} ({w.employeeCode})
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          Confirmation
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.confirmationStatus}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                confirmationStatus: e.target.value as ScheduleConfirmation,
              }))
            }
          >
            <option value={ScheduleConfirmation.TENTATIVE}>Tentative</option>
            <option value={ScheduleConfirmation.CONFIRMED}>Confirmed</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(form)}>
            Assign
          </Button>
        </div>
      </div>
    </Modal>
  );
}
