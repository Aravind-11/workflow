"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { completePickListAction, updatePickLineAction } from "@/features/logistics/actions";

type PickLine = {
  id: string;
  inventoryItem: { skuCode: string; name: string };
  fromLocation: { locationCode: string } | null;
  requestedQty: number;
  pickedQty: number;
  lotNumber: string | null;
  batchNumber: string | null;
};

type Props = {
  pickListId: string;
  pickListNumber: string;
  warehouseCode: string;
  shipmentNumber: string | null;
  shipmentId: string | null;
  status: string;
  lines: PickLine[];
};

export function PickListDetail({ pickListId, pickListNumber, warehouseCode, shipmentNumber, shipmentId, status, lines }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(lines.map((l) => [l.id, l.pickedQty])),
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const isDone = status === "COMPLETED";
  const allPicked = lines.every((l) => (quantities[l.id] ?? l.pickedQty) >= l.requestedQty);

  async function saveLine(lineId: string) {
    setSaving((s) => ({ ...s, [lineId]: true }));
    setErr(null);
    await updatePickLineAction({ lineId, pickedQty: quantities[lineId] ?? 0 });
    setSaving((s) => ({ ...s, [lineId]: false }));
    router.refresh();
  }

  async function completePick() {
    setCompleting(true);
    setErr(null);
    setOk(null);

    // Save all lines first
    for (const line of lines) {
      await updatePickLineAction({ lineId: line.id, pickedQty: quantities[line.id] ?? 0 });
    }

    const r = await completePickListAction(pickListId);
    setCompleting(false);
    if (!r.ok) {
      setErr(r.error ?? "Failed to complete pick list");
      return;
    }
    setOk("Scan complete! You can now create a pack list.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold dark:text-gray-100">{pickListNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {warehouseCode} · <span className={`font-medium ${isDone ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{status}</span>
            {shipmentNumber ? ` · Shipment ${shipmentNumber}` : ""}
          </p>
        </div>
        {!isDone && (
          <Button
            onClick={completePick}
            disabled={completing || !allPicked}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {completing ? "Completing..." : "✓ Complete scan"}
          </Button>
        )}
      </div>

      {!isDone && !allPicked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Enter scanned quantities for all lines before completing.
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {ok}
        </p>
      )}
      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {err}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">SKU / Item</th>
              <th className="px-4 py-2">CUSTBOX / Lot</th>
              <th className="px-4 py-2">Pallet / Batch</th>
              <th className="px-4 py-2">From bin</th>
              <th className="px-4 py-2 text-right">Requested</th>
              <th className="px-4 py-2 text-right">Picked</th>
              {!isDone && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((ln, idx) => {
              const qty = quantities[ln.id] ?? ln.pickedQty;
              const done = qty >= ln.requestedQty;
              return (
                <tr key={ln.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{ln.inventoryItem.skuCode}</span>
                    {ln.inventoryItem.name !== ln.inventoryItem.skuCode && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ln.inventoryItem.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{ln.lotNumber ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{ln.batchNumber ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{ln.fromLocation?.locationCode ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{ln.requestedQty}</td>
                  <td className="px-4 py-2 text-right">
                    {isDone ? (
                      <span className="font-medium text-green-700 dark:text-green-400">{ln.pickedQty}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={ln.requestedQty * 2}
                        value={qty}
                        onChange={(e) => setQuantities((q) => ({ ...q, [ln.id]: Number(e.target.value) }))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
                      />
                    )}
                  </td>
                  {!isDone && (
                    <td className="px-4 py-2 text-right">
                      {done ? (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Ready</span>
                      ) : (
                        <button
                          onClick={() => saveLine(ln.id)}
                          disabled={saving[ln.id]}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving[ln.id] ? "Saving…" : "Save"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shipmentId && (
        <a
          href={`/shipping/${shipmentId}`}
          className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Open shipment workflow →
        </a>
      )}
    </div>
  );
}
