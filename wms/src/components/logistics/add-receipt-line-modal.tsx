"use client";

import { useState } from "react";
import { ReceiptLineCondition } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import type { PO, Item } from "@/features/logistics/types/receiving";

export type ReceiptLineForm = {
  inventoryItemId: string;
  receivedQty: number;
  purchaseOrderLineId: string;
  locationId: string;
  lotNumber: string;
  batchNumber: string;
  condition: ReceiptLineCondition;
};

export function AddReceiptLineModal({
  open,
  onClose,
  inventoryItems,
  purchaseOrders,
  locations,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  inventoryItems: Item[];
  purchaseOrders: PO[];
  locations: { id: string; locationCode: string }[];
  onSubmit: (form: ReceiptLineForm) => void;
}) {
  const [form, setForm] = useState<ReceiptLineForm>({
    inventoryItemId: "",
    receivedQty: 1,
    purchaseOrderLineId: "",
    locationId: "",
    lotNumber: "",
    batchNumber: "",
    condition: ReceiptLineCondition.GOOD,
  });

  return (
    <Modal open={open} title="Add receipt line" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <label className="block">
          SKU
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.inventoryItemId}
            onChange={(e) => setForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
          >
            <option value="">Select…</option>
            {inventoryItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.skuCode} — {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Qty
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.receivedQty}
            onChange={(e) =>
              setForm((f) => ({ ...f, receivedQty: parseInt(e.target.value, 10) || 1 }))
            }
          />
        </label>
        <label className="block">
          PO line (optional if matching PO)
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.purchaseOrderLineId}
            onChange={(e) => setForm((f) => ({ ...f, purchaseOrderLineId: e.target.value }))}
          >
            <option value="">—</option>
            {purchaseOrders.flatMap((po) =>
              po.lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {po.poNumber} · {l.inventoryItem.skuCode} (open {l.orderedQty - l.receivedQty})
                </option>
              )),
            )}
          </select>
        </label>
        <label className="block">
          Staging location
          <select
            className="mt-1 w-full rounded-md border px-2 py-2"
            value={form.locationId}
            onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
          >
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationCode}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            Lot
            <input
              className="mt-1 w-full rounded-md border px-2 py-1"
              value={form.lotNumber}
              onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))}
            />
          </label>
          <label className="block">
            Batch
            <input
              className="mt-1 w-full rounded-md border px-2 py-1"
              value={form.batchNumber}
              onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={!form.inventoryItemId}
          >
            Add line
          </Button>
        </div>
      </div>
    </Modal>
  );
}
