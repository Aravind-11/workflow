"use server";

import { Prisma, ReturnStatus } from "@prisma/client";
import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db/prisma";
import { addReturnLineSchema, updateLineReceiveSchema, setDispositionSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateReturns } from "./shared";

export async function addReturnLineAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addReturnLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid line" };
  const d = parsed.data;
  const rma = await prisma.returnRMA.findUnique({ where: { id: d.returnRmaId } });
  if (!rma || rma.status === ReturnStatus.CLOSED || rma.status === ReturnStatus.REJECTED) {
    return { ok: false, error: "RMA not editable" };
  }
  const auth = await guardAction(P.returns.manage, rma.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const line = await prisma.$transaction(async (tx) => {
    const ln = await tx.returnLine.create({
      data: {
        returnRmaId: d.returnRmaId,
        inventoryItemId: d.inventoryItemId,
        quantity: d.quantity,
        receivedQty: 0,
        lotNumber: d.lotNumber ?? null,
        batchNumber: d.batchNumber ?? null,
      },
    });
    await writeAuditLog(
      {
        warehouseId: rma.warehouseId,
        entityType: "ReturnRMA",
        entityId: rma.id,
        action: "RETURN_LINE_ADDED",
        newValues: {
          lineId: ln.id,
          inventoryItemId: d.inventoryItemId,
          quantity: d.quantity,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return ln;
  });
  revalidateReturns(rma.id);
  return { ok: true, data: { id: line.id } };
}

export async function updateLineReceiveAction(input: unknown): Promise<ActionResult> {
  const parsed = updateLineReceiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const line = await prisma.returnLine.findUnique({
    where: { id: parsed.data.lineId },
    include: { returnRma: true },
  });
  if (!line) return { ok: false, error: "Line not found" };
  if (line.inventoryAppliedAt) {
    return { ok: false, error: "Line already posted to inventory" };
  }
  const auth = await guardAction(P.returns.manage, line.returnRma.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.$transaction(async (tx) => {
    await tx.returnLine.update({
      where: { id: parsed.data.lineId },
      data: { receivedQty: parsed.data.receivedQty },
    });
    await writeAuditLog(
      {
        warehouseId: line.returnRma.warehouseId,
        entityType: "ReturnRMA",
        entityId: line.returnRmaId,
        action: "RETURN_LINE_RECEIPT",
        newValues: {
          lineId: line.id,
          receivedQty: parsed.data.receivedQty,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
  });
  revalidateReturns(line.returnRmaId);
  return { ok: true };
}

export async function setDispositionAction(input: unknown): Promise<ActionResult> {
  const parsed = setDispositionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid disposition" };
  const { lineId, dispositionType, dispositionNote, restockLocationId } = parsed.data;
  const line = await prisma.returnLine.findUnique({
    where: { id: lineId },
    include: { returnRma: true },
  });
  if (!line) return { ok: false, error: "Not found" };
  if (line.inventoryAppliedAt) return { ok: false, error: "Already posted" };
  const auth = await guardAction(P.returns.manage, line.returnRma.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (restockLocationId) {
    const loc = await prisma.warehouseLocationHierarchy.findFirst({
      where: { id: restockLocationId, warehouseId: line.returnRma.warehouseId },
    });
    if (!loc) return { ok: false, error: "Invalid restock location" };
  }
  await prisma.$transaction(async (tx) => {
    await tx.returnLine.update({
      where: { id: lineId },
      data: {
        dispositionType,
        dispositionNote: dispositionNote ?? null,
        restockLocationId: restockLocationId ?? null,
      },
    });
    await writeAuditLog(
      {
        warehouseId: line.returnRma.warehouseId,
        entityType: "ReturnRMA",
        entityId: line.returnRmaId,
        action: "RETURN_DISPOSITION_SET",
        newValues: {
          lineId,
          dispositionType,
          dispositionNote,
          restockLocationId,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
  });
  revalidateReturns(line.returnRmaId);
  return { ok: true };
}
