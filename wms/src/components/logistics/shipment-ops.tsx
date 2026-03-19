"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackListStatus, PickListStatus, ShipmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  completePackListAction,
  completePickListAction,
  createPackListAction,
  createPickListAction,
  markShippedAction,
  updatePackLineAction,
  updatePickLineAction,
  updateShipmentAction,
} from "@/features/logistics/actions";

type Props = {
  shipmentId: string;
  warehouseId: string;
  shipment: {
    status: ShipmentStatus;
    carrier: string;
    serviceLevel: string | null;
    trackingNumber: string | null;
    plannedShipAt: string | null;
  };
  pickLists: {
    id: string;
    pickListNumber: string;
    status: PickListStatus;
    lines: {
      id: string;
      requestedQty: number;
      pickedQty: number;
      inventoryItem: { skuCode: string };
    }[];
  }[];
  packLists: {
    id: string;
    packListNumber: string;
    status: PackListStatus;
    lines: {
      id: string;
      packedQty: number;
      inventoryItem: { skuCode: string };
    }[];
  }[];
};

export function ShipmentOps({
  shipmentId,
  warehouseId,
  shipment,
  pickLists,
  packLists,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shipForm, setShipForm] = useState({
    carrier: shipment.carrier,
    serviceLevel: shipment.serviceLevel ?? "",
    trackingNumber: shipment.trackingNumber ?? "",
  });

  const pick = pickLists[0];
  const pack = packLists[0];

  async function saveShipment() {
    setMsg(null);
    const r = await updateShipmentAction({
      id: shipmentId,
      carrier: shipForm.carrier,
      serviceLevel: shipForm.serviceLevel || null,
      trackingNumber: shipForm.trackingNumber || null,
    });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function startPick() {
    setMsg(null);
    const r = await createPickListAction({
      warehouseId,
      shipmentId,
      scheduledDate: new Date(pickDate).toISOString(),
      assignedWorkerId: null,
    });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function finishPick() {
    if (!pick) return;
    setMsg(null);
    const r = await completePickListAction(pick.id);
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function startPack() {
    setMsg(null);
    const r = await createPackListAction({
      warehouseId,
      shipmentId,
      assignedWorkerId: null,
    });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function finishPack() {
    if (!pack) return;
    setMsg(null);
    const r = await completePackListAction(pack.id);
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function ship() {
    setMsg(null);
    const r = await markShippedAction(shipmentId);
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function setPicked(lineId: string, qty: number) {
    setMsg(null);
    const r = await updatePickLineAction({ lineId, pickedQty: qty });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function setPacked(lineId: string, qty: number) {
    setMsg(null);
    const r = await updatePackLineAction({ lineId, packedQty: qty });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6 text-sm">
      {msg ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{msg}</p>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Carrier &amp; tracking</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="block text-xs">
            Carrier
            <input
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={shipForm.carrier}
              onChange={(e) => setShipForm((f) => ({ ...f, carrier: e.target.value }))}
            />
          </label>
          <label className="block text-xs">
            Service level
            <input
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={shipForm.serviceLevel}
              onChange={(e) => setShipForm((f) => ({ ...f, serviceLevel: e.target.value }))}
            />
          </label>
          <label className="block text-xs sm:col-span-2">
            Tracking #
            <input
              className="mt-1 w-full rounded-md border px-2 py-1.5 font-mono"
              value={shipForm.trackingNumber}
              onChange={(e) => setShipForm((f) => ({ ...f, trackingNumber: e.target.value }))}
            />
          </label>
        </div>
        <Button type="button" className="mt-3" size="sm" variant="secondary" onClick={saveShipment}>
          Save
        </Button>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Pick</h2>
          {!pick ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                className="rounded-md border px-2 py-1 text-xs"
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
              />
              <Button type="button" size="sm" onClick={startPick} disabled={shipment.status === ShipmentStatus.SHIPPED}>
                Generate pick list
              </Button>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              {pick.pickListNumber} · {pick.status}
            </span>
          )}
        </div>
        {pick ? (
          <div className="mt-3 space-y-2">
            {pick.lines.map((ln) => (
              <div
                key={ln.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2"
              >
                <span className="font-mono text-xs">{ln.inventoryItem.skuCode}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span>
                    Picked{" "}
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded border px-1"
                      defaultValue={ln.pickedQty}
                      onBlur={(e) =>
                        setPicked(ln.id, parseInt(e.target.value, 10) || 0)
                      }
                    />{" "}
                    / {ln.requestedQty}
                  </span>
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={finishPick}
              disabled={pick.status === PickListStatus.COMPLETED}
            >
              Complete pick
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Create a pick list from shipment lines.</p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Pack</h2>
          {pick?.status === PickListStatus.COMPLETED && !pack ? (
            <Button type="button" size="sm" onClick={startPack}>
              Generate pack list
            </Button>
          ) : pack ? (
            <span className="text-xs text-gray-500">
              {pack.packListNumber} · {pack.status}
            </span>
          ) : (
            <span className="text-xs text-amber-700">Complete pick first</span>
          )}
        </div>
        {pack ? (
          <div className="mt-3 space-y-2">
            {pack.lines.map((ln) => (
              <div
                key={ln.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2"
              >
                <span className="font-mono text-xs">{ln.inventoryItem.skuCode}</span>
                <span className="text-xs">
                  Packed{" "}
                  <input
                    type="number"
                    min={0}
                    className="w-16 rounded border px-1"
                    defaultValue={ln.packedQty}
                    onBlur={(e) => setPacked(ln.id, parseInt(e.target.value, 10) || 0)}
                  />
                </span>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              className="mt-2"
              onClick={finishPack}
              disabled={pack.status === PackListStatus.COMPLETED}
            >
              Complete pack
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">Ship</h2>
        <p className="mt-1 text-xs text-gray-500">
          Mark carrier handoff after pack is complete. Status: {shipment.status}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={ship}
            disabled={
              shipment.status === ShipmentStatus.SHIPPED ||
              pack?.status !== PackListStatus.COMPLETED
            }
          >
            Mark shipped
          </Button>
          <Link
            href={`/shipping/${shipmentId}/label`}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            target="_blank"
          >
            Shipping label (print)
          </Link>
          <Link
            href={`/shipping/${shipmentId}/packing-slip`}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            target="_blank"
          >
            Packing slip (print)
          </Link>
        </div>
      </section>
    </div>
  );
}
