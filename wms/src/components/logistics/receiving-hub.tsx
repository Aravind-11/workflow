"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  InboundLineStatus,
  ReceiptLineCondition,
  ReceiptStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  addReceiptLineAction,
  createReceiptAction,
  postReceiptAction,
  updateReceiptLineAction,
} from "@/features/logistics/actions";
import type { ReceiptRow, PO, Del, Wh, Item } from "@/features/logistics/types/receiving";
import { AddReceiptLineModal } from "./add-receipt-line-modal";
import type { ReceiptLineForm } from "./add-receipt-line-modal";
import { DetailDrawer } from "./detail-drawer";
import { NewReceiptModal } from "./new-receipt-modal";

export function ReceivingHub({
  warehouses,
  initialWarehouseId,
  receipts,
  purchaseOrders,
  deliveries,
  inventoryItems,
  locations,
}: {
  warehouses: Wh[];
  initialWarehouseId: string;
  receipts: ReceiptRow[];
  purchaseOrders: PO[];
  deliveries: Del[];
  inventoryItems: Item[];
  locations: { id: string; locationCode: string }[];
}) {
  const router = useRouter();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState<string | null>(null);

  const openDrawer = useCallback(async (id: string) => {
    setDrawerId(id);
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/logistics/receipts/${id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setMsg("Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }, []);

  async function postReceipt(id: string) {
    setMsg(null);
    const r = await postReceiptAction(id);
    if (!r.ok) setMsg(r.error);
    else {
      router.refresh();
      openDrawer(id);
    }
  }

  async function patchLine(lineId: string, receiptId: string, patch: Record<string, unknown>) {
    const r = await updateReceiptLineAction({ id: lineId, ...patch });
    if (!r.ok) setMsg(r.error);
    else {
      router.refresh();
      openDrawer(receiptId);
    }
  }

  const d = detail as {
    id: string;
    receiptNumber: string;
    status: ReceiptStatus;
    lines: {
      id: string;
      receivedQty: number;
      condition: ReceiptLineCondition;
      inboundStatus: InboundLineStatus;
      lotNumber: string | null;
      inventoryItem: { skuCode: string; name: string };
      location: { locationCode: string } | null;
    }[];
  } | null;

  return (
    <div className="space-y-6">
      {msg ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{msg}</p>
      ) : null}

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Inbound flow</h2>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
          Delivery / PO → <strong>Receive</strong> → <strong>Inspect</strong> (condition &amp; line status) →{" "}
          <strong>Putaway</strong> → Post to inventory.
        </p>
        <ol className="mt-2 list-decimal pl-5 text-xs text-emerald-900/90 dark:text-emerald-200/90">
          <li>Create receipt (draft) — link PO and/or inbound delivery.</li>
          <li>Add lines with qty, lot, condition; move line status through inspection / putaway.</li>
          <li>Post receipt to update PO received quantities.</li>
        </ol>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
            <select
              name="warehouseId"
              defaultValue={initialWarehouseId}
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
        <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
          New receipt
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Receipt #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">PO / Delivery</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs font-medium">{r.receiptNumber}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === ReceiptStatus.POSTED
                        ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                        : r.status === ReceiptStatus.DRAFT
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.purchaseOrder ? <div>PO {r.purchaseOrder.poNumber}</div> : null}
                  {r.delivery ? <div>DLV {r.delivery.deliveryNumber}</div> : null}
                  {!r.purchaseOrder && !r.delivery ? "—" : null}
                </td>
                <td className="px-4 py-3">{r.lines.length}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(r.receivedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                    onClick={() => openDrawer(r.id)}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No receipts for this warehouse.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Tip: <strong>Draft</strong> = pending receipt; <strong>Received</strong> = lines captured;{" "}
        <strong>Posted</strong> = finalized and PO quantities updated.
      </p>

      <DetailDrawer
        open={!!drawerId}
        title={d ? `Receipt ${d.receiptNumber}` : "Receipt"}
        onClose={() => {
          setDrawerId(null);
          setDetail(null);
        }}
        widthClassName="max-w-xl"
      >
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : d ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/receiving/receipts/${d.id}`}
                className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                Full page →
              </Link>
              {d.status !== ReceiptStatus.POSTED ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLineOpen(d.id)}>
                    Add line
                  </Button>
                  <Button type="button" size="sm" onClick={() => postReceipt(d.id)}>
                    Post receipt
                  </Button>
                </>
              ) : null}
            </div>
            <table className="w-full text-xs">
              <thead className="text-left text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-1">SKU</th>
                  <th className="py-1">Qty</th>
                  <th className="py-1">Condition</th>
                  <th className="py-1">Stage</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((ln) => (
                  <tr key={ln.id} className="border-t border-gray-100 dark:border-navy-border">
                    <td className="py-2 font-mono">{ln.inventoryItem.skuCode}</td>
                    <td className="py-2">{ln.receivedQty}</td>
                    <td className="py-2">
                      {d.status !== ReceiptStatus.POSTED ? (
                        <select
                          className="rounded border px-1 py-0.5 dark:border-navy-border dark:bg-navy dark:text-gray-200"
                          value={ln.condition}
                          onChange={(e) =>
                            patchLine(ln.id, d.id, {
                              condition: e.target.value as ReceiptLineCondition,
                            })
                          }
                        >
                          {Object.values(ReceiptLineCondition).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ln.condition
                      )}
                    </td>
                    <td className="py-2">
                      {d.status !== ReceiptStatus.POSTED ? (
                        <select
                          className="rounded border px-1 py-0.5 dark:border-navy-border dark:bg-navy dark:text-gray-200"
                          value={ln.inboundStatus}
                          onChange={(e) =>
                            patchLine(ln.id, d.id, {
                              inboundStatus: e.target.value as InboundLineStatus,
                            })
                          }
                        >
                          {Object.values(InboundLineStatus).map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        ln.inboundStatus.replace("_", " ")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </DetailDrawer>

      <NewReceiptModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        purchaseOrders={purchaseOrders}
        deliveries={deliveries}
        onSubmit={async (form) => {
          if (!initialWarehouseId) return;
          setMsg(null);
          const r = await createReceiptAction({
            warehouseId: initialWarehouseId,
            purchaseOrderId: form.purchaseOrderId || null,
            deliveryId: form.deliveryId || null,
            notes: form.notes || null,
          });
          if (!r.ok) setMsg(r.error);
          else {
            setNewOpen(false);
            router.refresh();
            if (r.data?.id) openDrawer(r.data.id);
          }
        }}
      />

      <AddReceiptLineModal
        open={!!lineOpen}
        onClose={() => setLineOpen(null)}
        inventoryItems={inventoryItems}
        purchaseOrders={purchaseOrders}
        locations={locations}
        onSubmit={async (form: ReceiptLineForm) => {
          if (!lineOpen) return;
          setMsg(null);
          const r = await addReceiptLineAction({
            receiptId: lineOpen,
            inventoryItemId: form.inventoryItemId,
            receivedQty: form.receivedQty,
            purchaseOrderLineId: form.purchaseOrderLineId || null,
            locationId: form.locationId || null,
            lotNumber: form.lotNumber || null,
            batchNumber: form.batchNumber || null,
            condition: form.condition,
          });
          if (!r.ok) setMsg(r.error);
          else {
            setLineOpen(null);
            router.refresh();
            openDrawer(lineOpen);
          }
        }}
      />
    </div>
  );
}
