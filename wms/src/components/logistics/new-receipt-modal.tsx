"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import type { PO, Del } from "@/features/logistics/types/receiving";

export function NewReceiptModal({
  open,
  onClose,
  purchaseOrders,
  deliveries,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  purchaseOrders: PO[];
  deliveries: Del[];
  onSubmit: (form: { purchaseOrderId: string; deliveryId: string; notes: string }) => void;
}) {
  const [form, setForm] = useState({
    purchaseOrderId: "",
    deliveryId: "",
    notes: "",
  });

  function handleSubmit() {
    onSubmit(form);
    setForm({ purchaseOrderId: "", deliveryId: "", notes: "" });
  }

  return (
    <Modal open={open} title="New receipt" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-gray-600">Purchase order (optional)</span>
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.purchaseOrderId}
            onChange={(e) => setForm((f) => ({ ...f, purchaseOrderId: e.target.value }))}
          >
            <option value="">—</option>
            {purchaseOrders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.poNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-600">Inbound delivery (optional)</span>
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.deliveryId}
            onChange={(e) => setForm((f) => ({ ...f, deliveryId: e.target.value }))}
          >
            <option value="">—</option>
            {deliveries.map((p) => (
              <option key={p.id} value={p.id}>
                {p.deliveryNumber} ({p.status})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-600">Notes</span>
          <textarea
            className="mt-1 w-full rounded-md border px-2 py-2"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Create draft
          </Button>
        </div>
      </div>
    </Modal>
  );
}
