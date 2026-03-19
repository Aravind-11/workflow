"use client";

import type { ReturnDisposition } from "@prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  applyInventoryForLineAction,
  setDispositionAction,
  updateLineReceiveAction,
} from "@/features/returns/actions";
import type { RmaDetail, Loc } from "@/features/returns/types";
import { DISPOSITIONS } from "@/features/returns/types";
import { fmtWhen } from "@/lib/utils";

export function ReturnLineRow({
  line: ln,
  locations,
  locked,
  onDone,
  onError,
  onOk,
}: {
  line: RmaDetail["lines"][number];
  locations: Loc[];
  locked: boolean;
  onDone: () => void;
  onError: (e: string) => void;
  onOk: (m: string) => void;
}) {
  const [recv, setRecv] = useState(ln.receivedQty);
  const [disp, setDisp] = useState<ReturnDisposition | "">(ln.dispositionType ?? "");
  const [dispNote, setDispNote] = useState(ln.dispositionNote ?? "");
  const [locId, setLocId] = useState(ln.restockLocationId ?? "");
  const applied = Boolean(ln.inventoryAppliedAt);

  const needsLocation =
    disp === "RESTOCK" || disp === "REFURBISH" || disp === "QUARANTINE";

  async function saveRecv() {
    onError("");
    const r = await updateLineReceiveAction({ lineId: ln.id, receivedQty: recv });
    if (!r.ok) onError(r.error);
    else {
      onOk("Receipt saved.");
      onDone();
    }
  }

  async function saveDisp() {
    onError("");
    if (!disp) {
      onError("Select a disposition.");
      return;
    }
    const r = await setDispositionAction({
      lineId: ln.id,
      dispositionType: disp,
      dispositionNote: dispNote || null,
      restockLocationId: needsLocation ? locId || null : null,
    });
    if (!r.ok) onError(r.error);
    else {
      onOk("Disposition saved.");
      onDone();
    }
  }

  async function applyInv() {
    onError("");
    const r = await applyInventoryForLineAction({ lineId: ln.id });
    if (!r.ok) onError(r.error);
    else {
      onOk("Inventory updated.");
      onDone();
    }
  }

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-3 py-3">
        <div className="font-mono text-xs font-medium">{ln.inventoryItem.skuCode}</div>
        <div className="text-xs text-gray-500">{ln.inventoryItem.name}</div>
        {(ln.lotNumber || ln.batchNumber) && (
          <div className="mt-1 text-[10px] text-gray-400">
            {ln.lotNumber ? <>Lot {ln.lotNumber} </> : null}
            {ln.batchNumber ? <>Batch {ln.batchNumber}</> : null}
          </div>
        )}
      </td>
      <td className="px-3 py-3">{ln.quantity}</td>
      <td className="px-3 py-3">
        <input
          type="number"
          min={0}
          className="w-20 rounded border px-1 py-1 text-xs"
          disabled={locked || applied}
          value={recv}
          onChange={(e) => setRecv(Math.max(0, Number(e.target.value) || 0))}
        />
        <Button
          type="button"
          className="ml-1"
          size="sm"
          variant="outline"
          disabled={locked || applied}
          onClick={saveRecv}
        >
          Save
        </Button>
      </td>
      <td className="px-3 py-3">
        <select
          className="mb-1 max-w-[9rem] rounded border px-1 py-1 text-xs"
          disabled={locked || applied}
          value={disp}
          onChange={(e) => setDisp(e.target.value as ReturnDisposition | "")}
        >
          <option value="">—</option>
          {DISPOSITIONS.map((d) => (
            <option key={d} value={d}>
              {d.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <textarea
          className="w-full rounded border px-1 py-1 text-xs"
          rows={2}
          placeholder="QC notes"
          disabled={locked || applied}
          value={dispNote}
          onChange={(e) => setDispNote(e.target.value)}
        />
        <Button
          type="button"
          className="mt-1"
          size="sm"
          variant="secondary"
          disabled={locked || applied}
          onClick={saveDisp}
        >
          Save disposition
        </Button>
      </td>
      <td className="px-3 py-3">
        {needsLocation ? (
          <select
            className="w-full max-w-[10rem] rounded border px-1 py-1 text-xs"
            disabled={locked || applied}
            value={locId}
            onChange={(e) => setLocId(e.target.value)}
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationCode}
                {l.zone ? ` · ${l.zone}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
        {ln.restockLocation && <div className="text-xs text-gray-500">{ln.restockLocation.locationCode}</div>}
      </td>
      <td className="px-3 py-3">
        {applied ? (
          <span className="text-xs font-medium text-emerald-700">Posted {fmtWhen(ln.inventoryAppliedAt!)}</span>
        ) : (
          <Button type="button" size="sm" disabled={locked} onClick={applyInv}>
            Apply to inventory
          </Button>
        )}
      </td>
    </tr>
  );
}
