"use server";

import { Prisma, ReturnStatus } from "@prisma/client";
import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db/prisma";
import { createRmaSchema, updateRmaStatusSchema, updateRmaNotesSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateReturns } from "./shared";

export async function createRmaAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createRmaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid RMA data" };
  const d = parsed.data;
  const auth = await guardAction(P.returns.manage, d.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId } });
    if (!wh) return { ok: false, error: "Warehouse not found" };
    if (d.shipmentId) {
      const ship = await prisma.shipment.findFirst({
        where: { id: d.shipmentId, warehouseId: d.warehouseId },
      });
      if (!ship) return { ok: false, error: "Shipment not in warehouse" };
    }
    const rmaNumber = `RMA-${wh.code}-${Date.now().toString(36).toUpperCase()}`;
    const rma = await prisma.$transaction(async (tx) => {
      const row = await tx.returnRMA.create({
        data: {
          warehouseId: d.warehouseId,
          rmaNumber,
          customerName: d.customerName,
          reason: d.reason ?? null,
          shipmentId: d.shipmentId ?? null,
          originalOrderRef: d.originalOrderRef ?? null,
          exceptionReasonCode: d.exceptionReasonCode ?? null,
          notes: d.notes ?? null,
          status: ReturnStatus.OPEN,
        },
      });
      await writeAuditLog(
        {
          warehouseId: d.warehouseId,
          entityType: "ReturnRMA",
          entityId: row.id,
          action: "RMA_CREATED",
          newValues: {
            rmaNumber: row.rmaNumber,
            customerName: row.customerName,
            shipmentId: d.shipmentId,
            originalOrderRef: d.originalOrderRef,
            exceptionReasonCode: d.exceptionReasonCode,
          } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
      return row;
    });
    revalidateReturns(rma.id);
    return { ok: true, data: { id: rma.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function updateRmaStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = updateRmaStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status update" };
  const { id, status, receivedAt, closedAt } = parsed.data;
  try {
    const prev0 = await prisma.returnRMA.findUnique({ where: { id } });
    if (!prev0) return { ok: false, error: "Not found" };
    const auth = await guardAction(P.returns.manage, prev0.warehouseId);
    if (!auth.ok) return { ok: false, error: auth.error };
    await prisma.$transaction(async (tx) => {
      await tx.returnRMA.update({
        where: { id },
        data: {
          status,
          receivedAt:
            receivedAt === undefined
              ? undefined
              : receivedAt && receivedAt.trim()
                ? new Date(receivedAt)
                : null,
          closedAt:
            closedAt === undefined
              ? undefined
              : closedAt && closedAt.trim()
                ? new Date(closedAt)
                : null,
        },
      });
      await writeAuditLog(
        {
          warehouseId: prev0.warehouseId,
          entityType: "ReturnRMA",
          entityId: id,
          action: "RMA_STATUS",
          oldValues: { status: prev0.status } as unknown as Prisma.InputJsonValue,
          newValues: { status, receivedAt, closedAt } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    revalidateReturns(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}

export async function updateRmaNotesAction(input: unknown): Promise<ActionResult> {
  const parsed = updateRmaNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const row = await prisma.returnRMA.findUnique({ where: { id: parsed.data.id } });
  if (!row) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.returns.manage, row.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.returnRMA.update({
    where: { id: parsed.data.id },
    data: { notes: parsed.data.notes ?? null },
  });
  await writeAuditLog({
    warehouseId: row.warehouseId,
    entityType: "ReturnRMA",
    entityId: row.id,
    action: "RMA_NOTES_UPDATED",
    oldValues: { notes: row.notes } as unknown as Prisma.InputJsonValue,
    newValues: { notes: parsed.data.notes } as unknown as Prisma.InputJsonValue,
  });
  revalidateReturns(row.id);
  return { ok: true };
}
