"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import type { Appt } from "@/features/logistics/types/deliveries";

export type DeliveryForm = {
  carrier: string;
  scheduledAt: string;
  dockAppointmentId: string;
};

export function InboundDeliveryModal({
  open,
  onClose,
  appointments,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  appointments: Appt[];
  onSubmit: (form: DeliveryForm) => void;
}) {
  const [form, setForm] = useState<DeliveryForm>({
    carrier: "",
    scheduledAt: "",
    dockAppointmentId: "",
  });

  return (
    <Modal open={open} title="Inbound delivery" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <label className="block">
          Carrier
          <input
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.carrier}
            onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
          />
        </label>
        <label className="block">
          Scheduled (datetime-local)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
          />
        </label>
        <label className="block">
          Dock appointment (optional)
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.dockAppointmentId}
            onChange={(e) => setForm((f) => ({ ...f, dockAppointmentId: e.target.value }))}
          >
            <option value="">—</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.appointmentCode} · {a.dockDoor}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(form)}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
