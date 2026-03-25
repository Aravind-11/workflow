"use client";

import { useState } from "react";
import { PendingImagePicker, type PendingImage } from "@/components/attachments/pending-image-picker";
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
  onSubmit: (form: { purchaseOrderId: string; deliveryId: string; notes: string; images: PendingImage[] }) => void;
}) {
  const [form, setForm] = useState({
    purchaseOrderId: "",
    deliveryId: "",
    notes: "",
  });
  const [images, setImages] = useState<PendingImage[]>([]);

  function handleSubmit() {
    onSubmit({ ...form, images });
    setForm({ purchaseOrderId: "", deliveryId: "", notes: "" });
    setImages([]);
  }

  const fieldCls = "mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200";

  return (
    <Modal open={open} title="New receipt" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-gray-600 dark:text-gray-400">Purchase order (optional)</span>
          <select
            className={fieldCls}
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
          <span className="text-gray-600 dark:text-gray-400">Inbound delivery (optional)</span>
          <select
            className={fieldCls}
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
          <span className="text-gray-600 dark:text-gray-400">Notes</span>
          <textarea
            className={fieldCls}
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Attach photos (optional)</span>
          <div className="mt-1">
            <PendingImagePicker images={images} onChange={setImages} />
          </div>
        </div>
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
