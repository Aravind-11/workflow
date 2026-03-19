"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { createRmaAction } from "@/features/returns/actions";
import { EXCEPTION_REASON_CODES } from "@/features/returns/schemas";

type Wh = { id: string; code: string; name: string };
type Ship = {
  id: string;
  warehouseId: string;
  shipmentNumber: string;
  salesOrderRef: string | null;
};

export function CreateRmaModal({
  warehouses,
  shipments,
}: {
  warehouses: Wh[];
  shipments: Ship[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    warehouseId: warehouses[0]?.id ?? "",
    customerName: "",
    reason: "",
    shipmentId: "",
    originalOrderRef: "",
    exceptionReasonCode: "",
    notes: "",
  });

  const shipmentOptions = useMemo(
    () => shipments.filter((s) => s.warehouseId === form.warehouseId),
    [shipments, form.warehouseId],
  );

  async function submit() {
    setErr(null);
    const r = await createRmaAction({
      warehouseId: form.warehouseId,
      customerName: form.customerName,
      reason: form.reason || null,
      shipmentId: form.shipmentId || null,
      originalOrderRef: form.originalOrderRef || null,
      exceptionReasonCode: form.exceptionReasonCode || null,
      notes: form.notes || null,
    });
    if (!r.ok) setErr(r.error);
    else {
      setOpen(false);
      if (r.data?.id) router.push(`/returns/${r.data.id}`);
      else router.refresh();
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        New RMA
      </Button>
      <Modal open={open} title="Create return authorization (RMA)" onClose={() => setOpen(false)}>
        <div className="space-y-3 text-sm">
          {err ? (
            <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">{err}</p>
          ) : null}
          <label className="block">
            Warehouse
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={form.warehouseId}
              onChange={(e) =>
                setForm((f) => ({ ...f, warehouseId: e.target.value, shipmentId: "" }))
              }
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Customer name
            <input
              required
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
            />
          </label>
          <label className="block">
            Link shipment (optional)
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={form.shipmentId}
              onChange={(e) => setForm((f) => ({ ...f, shipmentId: e.target.value }))}
            >
              <option value="">—</option>
              {shipmentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shipmentNumber}
                  {s.salesOrderRef ? ` (${s.salesOrderRef})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Original order ref (if no shipment)
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 font-mono text-xs"
              value={form.originalOrderRef}
              onChange={(e) => setForm((f) => ({ ...f, originalOrderRef: e.target.value }))}
            />
          </label>
          <label className="block">
            Exception reason code
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={form.exceptionReasonCode}
              onChange={(e) => setForm((f) => ({ ...f, exceptionReasonCode: e.target.value }))}
            >
              <option value="">—</option>
              {EXCEPTION_REASON_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Reason (free text)
            <textarea
              className="mt-1 w-full rounded-md border px-2 py-2"
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
          <label className="block">
            Notes
            <textarea
              className="mt-1 w-full rounded-md border px-2 py-2"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={!form.customerName.trim()}>
              Create RMA
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
