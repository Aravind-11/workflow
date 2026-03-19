"use server";

import { PickListStatus, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createPickListSchema, pickLineUpdateSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export async function createPickListAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createPickListSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid pick list" };
  const { warehouseId, shipmentId, scheduledDate, assignedWorkerId } = parsed.data;
  const auth = await guardAction(P.picking.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const [wh, ship] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { shipmentLines: true },
    }),
  ]);
  if (!wh || !ship || ship.warehouseId !== warehouseId) {
    return { ok: false, error: "Invalid warehouse/shipment" };
  }
  if (ship.shipmentLines.length === 0) {
    return { ok: false, error: "Shipment has no lines" };
  }
  const pickListNumber = await nextDoc("PICK", wh.code);
  const pl = await prisma.pickList.create({
    data: {
      warehouseId,
      shipmentId,
      assignedWorkerId: assignedWorkerId ?? null,
      pickListNumber,
      scheduledDate: new Date(scheduledDate),
      status: PickListStatus.OPEN,
      lines: {
        create: ship.shipmentLines.map((sl) => ({
          inventoryItemId: sl.inventoryItemId,
          requestedQty: sl.quantity,
          pickedQty: 0,
          lotNumber: sl.lotNumber,
          batchNumber: sl.batchNumber,
        })),
      },
    },
  });
  revalidateLogisticsPages();
  return { ok: true, data: { id: pl.id } };
}

export async function updatePickLineAction(input: unknown): Promise<ActionResult> {
  const parsed = pickLineUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { lineId, pickedQty, status } = parsed.data;
  const line0 = await prisma.pickListLine.findUnique({
    where: { id: lineId },
    include: { pickList: true },
  });
  if (!line0) return { ok: false, error: "Line not found" };
  const auth = await guardAction(P.picking.manage, line0.pickList.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.pickListLine.update({
    where: { id: lineId },
    data: { pickedQty },
  });
  if (status) {
    await prisma.pickList.update({
      where: { id: line0.pickListId },
      data: { status },
    });
  }
  revalidateLogisticsPages();
  return { ok: true };
}

export async function completePickListAction(pickListId: string): Promise<ActionResult> {
  const pl = await prisma.pickList.findUnique({
    where: { id: pickListId },
    include: { lines: true, shipment: true },
  });
  if (!pl?.shipmentId) return { ok: false, error: "No shipment" };
  const auth = await guardAction(P.picking.manage, pl.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const allPicked = pl.lines.every((l) => l.pickedQty >= l.requestedQty);
  if (!allPicked) return { ok: false, error: "Pick all quantities first" };
  await prisma.$transaction([
    prisma.pickList.update({
      where: { id: pickListId },
      data: { status: PickListStatus.COMPLETED, completedAt: new Date() },
    }),
    prisma.shipment.update({
      where: { id: pl.shipmentId },
      data: { status: ShipmentStatus.PICKED },
    }),
  ]);
  revalidateLogisticsPages();
  return { ok: true };
}
