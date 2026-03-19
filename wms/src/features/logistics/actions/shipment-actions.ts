"use server";

import { ShipmentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createShipmentSchema, shipmentLineSchema, updateShipmentSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export async function createShipmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid shipment" };
  const d = parsed.data;
  const auth = await guardAction(P.shipping.manage, d.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId } });
    if (!wh) return { ok: false, error: "Warehouse not found" };
    const shipmentNumber = await nextDoc("SHP", wh.code);
    const s = await prisma.shipment.create({
      data: {
        warehouseId: d.warehouseId,
        shipmentNumber,
        salesOrderRef: d.salesOrderRef ?? null,
        carrier: d.carrier,
        serviceLevel: d.serviceLevel ?? null,
        trackingNumber: d.trackingNumber ?? null,
        dockAppointmentId: d.dockAppointmentId ?? null,
        status: ShipmentStatus.CREATED,
      },
    });
    revalidateLogisticsPages();
    return { ok: true, data: { id: s.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function addShipmentLineAction(input: unknown): Promise<ActionResult> {
  const parsed = shipmentLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const x = parsed.data;
  const ship = await prisma.shipment.findUnique({ where: { id: x.shipmentId } });
  if (!ship) return { ok: false, error: "Shipment not found" };
  const auth = await guardAction(P.shipping.manage, ship.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.shipmentLine.create({
    data: {
      shipmentId: x.shipmentId,
      inventoryItemId: x.inventoryItemId,
      quantity: x.quantity,
      lotNumber: x.lotNumber ?? null,
      batchNumber: x.batchNumber ?? null,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}

export async function updateShipmentAction(input: unknown): Promise<ActionResult> {
  const parsed = updateShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { id, ...rest } = parsed.data;
  const ship = await prisma.shipment.findUnique({ where: { id } });
  if (!ship) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.shipping.manage, ship.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.shipment.update({
    where: { id },
    data: {
      carrier: rest.carrier,
      serviceLevel: rest.serviceLevel === undefined ? undefined : rest.serviceLevel,
      trackingNumber: rest.trackingNumber === undefined ? undefined : rest.trackingNumber,
      status: rest.status,
      plannedShipAt:
        rest.plannedShipAt === undefined
          ? undefined
          : rest.plannedShipAt && rest.plannedShipAt.trim()
            ? new Date(rest.plannedShipAt)
            : null,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}

export async function markShippedAction(shipmentId: string): Promise<ActionResult> {
  const s = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!s) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.shipping.manage, s.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: ShipmentStatus.SHIPPED,
      shippedAt: new Date(),
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}
