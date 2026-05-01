"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShipmentStatus } from "@prisma/client";
import { PendingImagePicker, type PendingImage } from "@/components/attachments/pending-image-picker";
import { uploadPendingImages } from "@/components/attachments/upload-pending";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { addShipmentLineAction, createShipmentAction } from "@/features/logistics/actions";

type Row = {
  id: string;
  shipmentNumber: string;
  status: ShipmentStatus;
  carrier: string;
  serviceLevel: string | null;
  trackingNumber: string | null;
  plannedShipAt: string | null;
  shippedAt?: string | null;
  salesOrderRef?: string | null;
  warehouse: { code: string };
  shipmentLines: { id: string; quantity: number; inventoryItem: { skuCode: string } }[];
  pickLists: { id: string; pickListNumber: string; status: string }[];
  packLists: { id: string; packListNumber: string; status: string }[];
};

type Wh = { id: string; code: string; name: string };

type Sku = { id: string; skuCode: string; name: string };

export function ShipmentHub({
  warehouses,
  warehouseId,
  shipments,
  inventoryItems,
}: {
  warehouses: Wh[];
  warehouseId: string;
  shipments: Row[];
  inventoryItems: Sku[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState<string | null>(null);
  const [form, setForm] = useState({
    carrier: "FedEx",
    serviceLevel: "Ground",
    trackingNumber: "",
    salesOrderRef: "",
  });
  const [lineForm, setLineForm] = useState({ inventoryItemId: "", quantity: 1 });
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function createShipment() {
    setErr(null);
    const r = await createShipmentAction({
      warehouseId,
      carrier: form.carrier,
      serviceLevel: form.serviceLevel || null,
      trackingNumber: form.trackingNumber || null,
      salesOrderRef: form.salesOrderRef || null,
    });
    if (!r.ok) setErr(r.error);
    else {
      if (r.data?.id && pendingImages.length > 0) {
        await uploadPendingImages("Shipment", r.data.id, pendingImages);
      }
      setPendingImages([]);
      setOpen(false);
      router.refresh();
      if (r.data?.id) setLineOpen(r.data.id);
    }
  }

  async function addLine(shipmentId: string) {
    setErr(null);
    const r = await addShipmentLineAction({
      shipmentId,
      inventoryItemId: lineForm.inventoryItemId,
      quantity: lineForm.quantity,
    });
    if (!r.ok) setErr(r.error);
    else {
      setLineOpen(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {err ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{err}</p>
      ) : null}

      <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
        <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Outbound flow</h2>
        <p className="mt-1 text-sm text-blue-900/90 dark:text-blue-200/90">
          Order / shipment → <strong>Pick list</strong> → <strong>Pack list</strong> →{" "}
          <strong>Ship</strong> (carrier, service, tracking).
        </p>
      </section>

      {(() => {
        const total = shipments.length;
        const shipped = shipments.filter((s) => s.status === ShipmentStatus.SHIPPED).length;
        let totalPages = 0;
        for (const s of shipments) {
          const m = /([\d,]+)\s+pages/.exec(s.serviceLevel ?? "");
          if (m) totalPages += parseInt(m[1].replace(/,/g, ""), 10) || 0;
        }
        return (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard label="Total exports" value={total.toLocaleString()} tint="blue" />
            <SummaryCard label="Shipped" value={shipped.toLocaleString()} tint="green" />
            <SummaryCard label="Pages exported" value={totalPages.toLocaleString()} tint="indigo" />
          </section>
        );
      })()}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
            <select
              name="warehouseId"
              defaultValue={warehouseId}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
        </form>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          New shipment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Export ID</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Box</th>
              <th className="px-4 py-3">Pages</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Shipped</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => {
              const sku = s.shipmentLines[0]?.inventoryItem.skuCode ?? "";
              const boxId = sku.startsWith("MAIL-") ? sku.slice(5) : sku || "—";
              const ref = s.salesOrderRef ?? "";
              const batch = ref.startsWith("LACO-") ? ref.slice(5) : ref || null;
              const pagesMatch = /([\d,]+)\s+pages/.exec(s.serviceLevel ?? "");
              const pages = pagesMatch ? pagesMatch[1] : null;
              return (
                <tr key={s.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{s.shipmentNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{batch ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{boxId}</td>
                  <td className="px-4 py-3 text-xs font-semibold tabular-nums">
                    {pages ?? <span className="font-normal text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-500/15 dark:text-blue-300">
                      {s.carrier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-white/10 dark:text-gray-300">{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {s.shippedAt ? new Date(s.shippedAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/shipping/${s.id}`}
                      className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No shipments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Create shipment" onClose={() => setOpen(false)}>
        <div className="space-y-2 text-sm">
          <label className="block">
            Carrier
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={form.carrier}
              onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
            />
          </label>
          <label className="block">
            Service level
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={form.serviceLevel}
              onChange={(e) => setForm((f) => ({ ...f, serviceLevel: e.target.value }))}
            />
          </label>
          <label className="block">
            Tracking # (optional)
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={form.trackingNumber}
              onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
            />
          </label>
          <label className="block">
            Sales order ref
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={form.salesOrderRef}
              onChange={(e) => setForm((f) => ({ ...f, salesOrderRef: e.target.value }))}
            />
          </label>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Attach photos (optional)</span>
            <div className="mt-1">
              <PendingImagePicker images={pendingImages} onChange={setPendingImages} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createShipment}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!lineOpen} title="Add shipment line" onClose={() => setLineOpen(null)}>
        <div className="space-y-2 text-sm">
          <label className="block">
            SKU
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={lineForm.inventoryItemId}
              onChange={(e) => setLineForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
            >
              <option value="">Select…</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.skuCode}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Qty
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border px-2 py-2 dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={lineForm.quantity}
              onChange={(e) =>
                setLineForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 1 }))
              }
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setLineOpen(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => lineOpen && addLine(lineOpen)}
              disabled={!lineForm.inventoryItemId}
            >
              Add line
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: "blue" | "green" | "indigo";
}) {
  const tintClasses: Record<typeof tint, string> = {
    blue: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
    green: "border-green-200 bg-green-50/70 text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200",
    indigo: "border-indigo-200 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${tintClasses[tint]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
