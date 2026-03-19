"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import type { SchedRow } from "@/features/workers/types/schedule";

export function SwapSchedulesModal({
  open,
  onClose,
  schedules,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  schedules: SchedRow[];
  onSubmit: (a: string, b: string) => void;
}) {
  const [pair, setPair] = useState({ a: "", b: "" });

  return (
    <Modal open={open} title="Swap workers on two schedules" onClose={onClose}>
      <p className="mb-2 text-xs text-gray-600">
        Pick two assignments in this warehouse. We validate overlaps and time off.
      </p>
      <div className="space-y-2 text-sm">
        <label className="block">
          Schedule A
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={pair.a}
            onChange={(e) => setPair((p) => ({ ...p, a: e.target.value }))}
          >
            <option value="">—</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.workerProfile.employeeCode} · {format(new Date(s.scheduleDate), "MMM d")} ·{" "}
                {s.shift.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Schedule B
          <select
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            value={pair.b}
            onChange={(e) => setPair((p) => ({ ...p, b: e.target.value }))}
          >
            <option value="">—</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.workerProfile.employeeCode} · {format(new Date(s.scheduleDate), "MMM d")} ·{" "}
                {s.shift.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(pair.a, pair.b)} disabled={!pair.a || !pair.b}>
            Swap
          </Button>
        </div>
      </div>
    </Modal>
  );
}
