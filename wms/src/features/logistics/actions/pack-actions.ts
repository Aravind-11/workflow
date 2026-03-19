"use server";

import { PackListStatus, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createPackListSchema, packLineUpdateSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export async function createPackListAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createPackListSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { warehouseId, shipmentId, assignedWorkerId } = parsed.data;
  const auth = await guardAction(P.packing.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const ship = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { shipmentLines: true },
  });
  if (!ship || ship.warehouseId !== warehouseId) return { ok: false, error: "Invalid" };
  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!wh) return { ok: false, error: "Warehouse not found" };
  const packListNumber = await nextDoc("PACK", wh.code);
  const pack = await prisma.packList.create({
    data: {
      warehouseId,
      shipmentId,
      assignedWorkerId: assignedWorkerId ?? null,
      packListNumber,
      status: PackListStatus.OPEN,
      lines: {
        create: ship.shipmentLines.map((sl) => ({
          inventoryItemId: sl.inventoryItemId,
          packedQty: 0,
          lotNumber: sl.lotNumber,
          batchNumber: sl.batchNumber,
        })),
      },
    },
  });
  revalidateLogisticsPages();
  return { ok: true, data: { id: pack.id } };
}

export async function updatePackLineAction(input: unknown): Promise<ActionResult> {
  const parsed = packLineUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const ln = await prisma.packListLine.findUnique({
    where: { id: parsed.data.lineId },
    include: { packList: true },
  });
  if (!ln) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.packing.manage, ln.packList.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.packListLine.update({
    where: { id: parsed.data.lineId },
    data: { packedQty: parsed.data.packedQty },
  });
  revalidateLogisticsPages();
  return { ok: true };
}

export async function completePackListAction(packListId: string): Promise<ActionResult> {
  const pack = await prisma.packList.findUnique({
    where: { id: packListId },
    include: { lines: true, shipment: { include: { shipmentLines: true } } },
  });
  if (!pack) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.packing.manage, pack.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const okQty = pack.lines.every((l) => {
    const sl = pack.shipment.shipmentLines.find((x) => x.inventoryItemId === l.inventoryItemId);
    return sl ? l.packedQty >= sl.quantity : false;
  });
  if (!okQty) return { ok: false, error: "Packed qty must meet shipment qty per SKU" };
  await prisma.$transaction([
    prisma.packList.update({
      where: { id: packListId },
      data: {
        status: PackListStatus.COMPLETED,
        packedAt: new Date(),
      },
    }),
    prisma.shipment.update({
      where: { id: pack.shipmentId },
      data: { status: ShipmentStatus.PACKED },
    }),
  ]);
  revalidateLogisticsPages();
  return { ok: true };
}
