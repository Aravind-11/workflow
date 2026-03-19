"use client";

import type { ReturnStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import {
  addReturnCommentAction,
  addReturnLineAction,
  updateRmaNotesAction,
  updateRmaStatusAction,
} from "@/features/returns/actions";
import type { RmaDetail, AuditRow, Loc, Sku } from "@/features/returns/types";
import { fmtWhen, toLocalInput, jsonBrief } from "@/lib/utils";
import { ReturnLineRow } from "./return-line-row";

export function ReturnDetailPanel({
  rma,
  audit,
  locations,
  skus,
}: {
  rma: RmaDetail;
  audit: AuditRow[];
  locations: Loc[];
  skus: Sku[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const locked = rma.status === "CLOSED" || rma.status === "REJECTED";

  const refresh = () => router.refresh();

  const statusForm = useMemo(
    () => ({
      status: rma.status,
      receivedAt: toLocalInput(rma.receivedAt),
      closedAt: toLocalInput(rma.closedAt),
    }),
    [rma.status, rma.receivedAt, rma.closedAt],
  );

  const [sf, setSf] = useState(statusForm);
  useEffect(() => {
    setSf(statusForm);
  }, [statusForm]);

  async function saveStatus() {
    setErr(null);
    setMsg(null);
    const r = await updateRmaStatusAction({
      id: rma.id,
      status: sf.status,
      receivedAt: sf.receivedAt || null,
      closedAt: sf.closedAt || null,
    });
    if (!r.ok) setErr(r.error);
    else {
      setMsg("Status updated.");
      refresh();
    }
  }

  const [notes, setNotes] = useState(rma.notes ?? "");
  useEffect(() => {
    setNotes(rma.notes ?? "");
  }, [rma.notes]);
  async function saveNotes() {
    setErr(null);
    setMsg(null);
    const r = await updateRmaNotesAction({ id: rma.id, notes: notes || null });
    if (!r.ok) setErr(r.error);
    else {
      setMsg("Notes saved.");
      refresh();
    }
  }

  const [commentBody, setCommentBody] = useState("");
  const [commentInternal, setCommentInternal] = useState(true);
  async function addComment() {
    setErr(null);
    setMsg(null);
    const r = await addReturnCommentAction({
      returnRmaId: rma.id,
      body: commentBody,
      isInternal: commentInternal,
    });
    if (!r.ok) setErr(r.error);
    else {
      setCommentBody("");
      setMsg("Comment added.");
      refresh();
    }
  }

  const [addOpen, setAddOpen] = useState(false);
  const [lineForm, setLineForm] = useState({
    inventoryItemId: skus[0]?.id ?? "",
    quantity: 1,
    lotNumber: "",
    batchNumber: "",
  });

  async function addLine() {
    setErr(null);
    setMsg(null);
    const r = await addReturnLineAction({
      returnRmaId: rma.id,
      inventoryItemId: lineForm.inventoryItemId,
      quantity: lineForm.quantity,
      lotNumber: lineForm.lotNumber || null,
      batchNumber: lineForm.batchNumber || null,
    });
    if (!r.ok) setErr(r.error);
    else {
      setAddOpen(false);
      setMsg("Line added.");
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      {(msg || err) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {msg ? (
            <p className="rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-900">{msg}</p>
          ) : null}
          {err ? <p className="rounded-md bg-red-50 px-3 py-1.5 text-red-900">{err}</p> : null}
        </div>
      )}

      <header className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-bold text-gray-900">{rma.rmaNumber}</p>
            <p className="mt-1 text-gray-700">{rma.customerName}</p>
            <p className="mt-2 text-xs text-gray-500">
              {rma.warehouse.code} · {rma.warehouse.name}
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Created {fmtWhen(rma.createdAt)}</div>
            <div>Updated {fmtWhen(rma.updatedAt)}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {rma.shipment ? (
            <div>
              <span className="text-gray-500">Shipment</span>{" "}
              <Link
                href={`/shipping/${rma.shipment.id}`}
                className="font-mono font-medium text-blue-700 hover:underline"
              >
                {rma.shipment.shipmentNumber}
              </Link>
              {rma.shipment.salesOrderRef ? (
                <span className="text-gray-500"> · SO {rma.shipment.salesOrderRef}</span>
              ) : null}
            </div>
          ) : null}
          {rma.originalOrderRef ? (
            <div>
              <span className="text-gray-500">Order ref</span>{" "}
              <span className="font-mono">{rma.originalOrderRef}</span>
            </div>
          ) : null}
          <div>
            <span className="text-gray-500">Exception code</span>{" "}
            <span className="font-medium">{rma.exceptionReasonCode ?? "—"}</span>
          </div>
        </div>

        {rma.reason ? (
          <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-800">
            <span className="font-medium text-gray-600">Reason: </span>
            {rma.reason}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status & dates</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                Status
                <select
                  className="mt-1 block rounded-md border border-gray-300 px-2 py-2 text-sm"
                  disabled={locked}
                  value={sf.status}
                  onChange={(e) => setSf((s) => ({ ...s, status: e.target.value as ReturnStatus }))}
                >
                  {(
                    [
                      "OPEN",
                      "AUTHORIZED",
                      "RECEIVED",
                      "QC",
                      "CLOSED",
                      "REJECTED",
                    ] as ReturnStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Received at
                <input
                  type="datetime-local"
                  className="mt-1 block rounded-md border border-gray-300 px-2 py-2 text-sm"
                  disabled={locked}
                  value={sf.receivedAt}
                  onChange={(e) => setSf((s) => ({ ...s, receivedAt: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                Closed at
                <input
                  type="datetime-local"
                  className="mt-1 block rounded-md border border-gray-300 px-2 py-2 text-sm"
                  disabled={locked}
                  value={sf.closedAt}
                  onChange={(e) => setSf((s) => ({ ...s, closedAt: e.target.value }))}
                />
              </label>
              <Button type="button" disabled={locked} size="sm" onClick={saveStatus}>
                Save status
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</p>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
              rows={3}
              disabled={locked}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button type="button" className="mt-2" size="sm" disabled={locked} onClick={saveNotes}>
              Save notes
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Return lines</h2>
            <Button type="button" size="sm" disabled={locked} onClick={() => setAddOpen(true)}>
              Add line
            </Button>
          </div>

          {rma.shipment?.shipmentLines?.length ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 text-xs text-gray-600">
              <span className="font-medium text-gray-700">Original shipment contents: </span>
              {rma.shipment.shipmentLines.map((ln, i) => (
                <span key={i}>
                  {ln.inventoryItem.skuCode} ×{ln.quantity}
                  {i < rma.shipment!.shipmentLines.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Auth</th>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Disposition</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rma.lines.map((ln) => (
                  <ReturnLineRow
                    key={`${ln.id}-${ln.receivedQty}-${ln.dispositionType ?? ""}-${ln.dispositionNote ?? ""}-${ln.restockLocationId ?? ""}-${ln.inventoryAppliedAt ? String(ln.inventoryAppliedAt) : ""}`}
                    line={ln}
                    locations={locations}
                    locked={locked}
                    onDone={() => {
                      setMsg(null);
                      refresh();
                    }}
                    onError={(e) => setErr(e)}
                    onOk={(m) => {
                      setErr(null);
                      setMsg(m);
                    }}
                  />
                ))}
                {rma.lines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No lines yet. Add expected SKUs or receive against the shipment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
              {rma.comments.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-lg border p-2 ${c.isInternal ? "border-amber-200 bg-amber-50/80" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{c.isInternal ? "Internal" : "External"}</span>
                    <span>{fmtWhen(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-gray-800">{c.body}</p>
                  {c.user ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {c.user.fullName ?? c.user.email ?? "User"}
                    </p>
                  ) : null}
                </li>
              ))}
              {rma.comments.length === 0 && (
                <li className="text-sm text-gray-500">No comments yet.</li>
              )}
            </ul>
            <div className="mt-3 space-y-2">
              <textarea
                className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                rows={3}
                placeholder="Add a note or internal comment…"
                disabled={locked}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={commentInternal}
                  disabled={locked}
                  onChange={(e) => setCommentInternal(e.target.checked)}
                />
                Internal (not visible to customer-facing flows)
              </label>
              <Button type="button" size="sm" disabled={locked || !commentBody.trim()} onClick={addComment}>
                Post comment
              </Button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Audit & status history</h2>
            <ol className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto text-xs">
              {audit.map((a) => (
                <li key={a.id} className="rounded-lg border border-gray-100 bg-gray-50/90 p-2">
                  <div className="flex flex-wrap justify-between gap-1 font-medium text-gray-800">
                    <span>{a.action.replace(/_/g, " ")}</span>
                    <span className="text-gray-500">
                      {fmtWhen(typeof a.createdAt === "string" ? a.createdAt : String(a.createdAt))}
                    </span>
                  </div>
                  {a.oldValues != null ? (
                    <p className="mt-1 break-all text-gray-600">
                      <span className="text-gray-400">From:</span> {jsonBrief(a.oldValues)}
                    </p>
                  ) : null}
                  {a.newValues != null ? (
                    <p className="mt-1 break-all text-gray-600">
                      <span className="text-gray-400">To:</span> {jsonBrief(a.newValues)}
                    </p>
                  ) : null}
                </li>
              ))}
              {audit.length === 0 && <li className="text-gray-500">No audit entries yet.</li>}
            </ol>
          </section>
        </aside>
      </div>

      <Modal open={addOpen} title="Add return line" onClose={() => setAddOpen(false)}>
        <div className="space-y-3 text-sm">
          <label className="block">
            SKU
            <select
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={lineForm.inventoryItemId}
              onChange={(e) => setLineForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
            >
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.skuCode} — {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Expected qty
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border px-2 py-2"
              value={lineForm.quantity}
              onChange={(e) =>
                setLineForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value) || 1) }))
              }
            />
          </label>
          <label className="block">
            Lot (optional)
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 font-mono text-xs"
              value={lineForm.lotNumber}
              onChange={(e) => setLineForm((f) => ({ ...f, lotNumber: e.target.value }))}
            />
          </label>
          <label className="block">
            Batch (optional)
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 font-mono text-xs"
              value={lineForm.batchNumber}
              onChange={(e) => setLineForm((f) => ({ ...f, batchNumber: e.target.value }))}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addLine}>
              Add line
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
