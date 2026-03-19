"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

export type DockForm = {
  appointmentCode: string;
  carrier: string;
  dockDoor: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export function DockAppointmentModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: DockForm) => void;
}) {
  const [form, setForm] = useState<DockForm>({
    appointmentCode: "",
    carrier: "",
    dockDoor: "D-01",
    scheduledStart: "",
    scheduledEnd: "",
  });

  return (
    <Modal open={open} title="Dock appointment" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <label className="block">
          Code
          <input
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.appointmentCode}
            onChange={(e) => setForm((f) => ({ ...f, appointmentCode: e.target.value }))}
          />
        </label>
        <label className="block">
          Carrier
          <input
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.carrier}
            onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
          />
        </label>
        <label className="block">
          Door
          <input
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.dockDoor}
            onChange={(e) => setForm((f) => ({ ...f, dockDoor: e.target.value }))}
          />
        </label>
        <label className="block">
          Start (datetime-local)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.scheduledStart}
            onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))}
          />
        </label>
        <label className="block">
          End (datetime-local)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.scheduledEnd}
            onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))}
          />
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
