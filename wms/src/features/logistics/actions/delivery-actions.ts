"use server";

import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createDeliverySchema, updateDeliverySchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export async function createDeliveryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createDeliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid delivery" };
  const d = parsed.data;
  const auth = await guardAction(P.deliveries.manage, d.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId } });
  if (!wh) return { ok: false, error: "Warehouse not found" };
  const deliveryNumber = await nextDoc("DLV", wh.code);
  const row = await prisma.delivery.create({
    data: {
      warehouseId: d.warehouseId,
      dockAppointmentId: d.dockAppointmentId ?? null,
      deliveryNumber,
      direction: d.direction,
      carrier: d.carrier,
      scheduledAt: new Date(d.scheduledAt),
      status: DeliveryStatus.SCHEDULED,
    },
  });
  revalidateLogisticsPages();
  return { ok: true, data: { id: row.id } };
}

export async function updateDeliveryAction(input: unknown): Promise<ActionResult> {
  const parsed = updateDeliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { id, status, arrivedAt, releasedAt } = parsed.data;
  const row = await prisma.delivery.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.deliveries.manage, row.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.delivery.update({
    where: { id },
    data: {
      status,
      arrivedAt:
        arrivedAt === undefined
          ? undefined
          : arrivedAt && arrivedAt.trim()
            ? new Date(arrivedAt)
            : null,
      releasedAt:
        releasedAt === undefined
          ? undefined
          : releasedAt && releasedAt.trim()
            ? new Date(releasedAt)
            : null,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}
