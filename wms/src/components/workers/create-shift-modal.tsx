"use client";

import { useState } from "react";
import type { ShiftType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

export type ShiftForm = {
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
};

export function CreateShiftModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ShiftForm) => void;
}) {
  const [form, setForm] = useState<ShiftForm>({
    name: "",
    shiftType: "MORNING" as ShiftType,
    startTime: "06:00",
    endTime: "14:00",
    isOvernight: false,
  });

  return (
    <Modal open={open} title="New shift template" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <label className="block">
          Name
          <input
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="block">
          Type
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={form.shiftType}
            onChange={(e) =>
              setForm((f) => ({ ...f, shiftType: e.target.value as ShiftType }))
            }
          >
            {(["MORNING", "EVENING", "NIGHT"] as const).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            Start (HH:mm)
            <input
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </label>
          <label>
            End (HH:mm)
            <input
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isOvernight}
            onChange={(e) => setForm((f) => ({ ...f, isOvernight: e.target.checked }))}
          />
          Overnight (end after midnight)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(form)}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
