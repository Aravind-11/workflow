"use server";

import { InventoryTransactionType, Prisma, ReturnDisposition } from "@prisma/client";
import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db/prisma";
import { applyInventorySchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateReturns, normLot, balanceStatusForDisposition } from "./shared";

export async function applyInventoryForLineAction(input: unknown): Promise<ActionResult> {
  const parsed = applyInventorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { lineId } = parsed.data;

  const line = await prisma.returnLine.findUnique({
    where: { id: lineId },
    include: { returnRma: true, inventoryItem: true },
  });
  if (!line) return { ok: false, error: "Line not found" };
  if (line.inventoryAppliedAt) return { ok: false, error: "Already applied" };
  const auth = await guardAction(P.returns.manage, line.returnRma.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!line.dispositionType) return { ok: false, error: "Set disposition first" };
  if (line.receivedQty <= 0) return { ok: false, error: "Record received qty first" };

  if (
    line.dispositionType === ReturnDisposition.SCRAP ||
    line.dispositionType === ReturnDisposition.RETURN_TO_VENDOR
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.returnLine.update({
        where: { id: lineId },
        data: { inventoryAppliedAt: new Date() },
      });
      await writeAuditLog(
        {
          warehouseId: line.returnRma.warehouseId,
          entityType: "ReturnRMA",
          entityId: line.returnRmaId,
          action: "RETURN_LINE_CLOSED_NO_STOCK",
          newValues: {
            lineId,
            dispositionType: line.dispositionType,
          } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    revalidateReturns(line.returnRmaId);
    return { ok: true };
  }

  if (!line.restockLocationId) {
    return { ok: false, error: "Select a putaway / restock location" };
  }

  const qty = line.receivedQty;
  const lot = normLot(line.lotNumber);
  const batch = normLot(line.batchNumber);
  const balanceStatus = balanceStatusForDisposition(line.dispositionType);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryBalance.findFirst({
        where: {
          warehouseId: line.returnRma.warehouseId,
          locationId: line.restockLocationId!,
          inventoryItemId: line.inventoryItemId,
          lotNumber: lot,
          batchNumber: batch,
        },
      });

      const before = existing?.onHandQty ?? 0;
      const after = before + qty;

      const bal = existing
        ? await tx.inventoryBalance.update({
            where: { id: existing.id },
            data: {
              onHandQty: after,
              status: balanceStatus,
            },
          })
        : await tx.inventoryBalance.create({
            data: {
              warehouseId: line.returnRma.warehouseId,
              locationId: line.restockLocationId!,
              inventoryItemId: line.inventoryItemId,
              lotNumber: lot,
              batchNumber: batch,
              expiryDate: line.expiryDate,
              onHandQty: qty,
              reservedQty: 0,
              status: balanceStatus,
            },
          });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId: line.returnRma.warehouseId,
          locationId: line.restockLocationId!,
          inventoryItemId: line.inventoryItemId,
          transactionType: InventoryTransactionType.RETURN,
          referenceType: "return_line",
          referenceId: line.id,
          lotNumber: lot,
          batchNumber: batch,
          expiryDate: line.expiryDate,
          quantityBefore: before,
          quantityDelta: qty,
          quantityAfter: after,
          notes: `RMA restock · ${line.returnRma.rmaNumber}`,
        },
      });

      await tx.returnLine.update({
        where: { id: lineId },
        data: { inventoryAppliedAt: new Date() },
      });

      await writeAuditLog(
        {
          warehouseId: line.returnRma.warehouseId,
          entityType: "ReturnRMA",
          entityId: line.returnRmaId,
          action: "RETURN_INVENTORY_APPLIED",
          newValues: {
            lineId,
            dispositionType: line.dispositionType,
            balanceId: bal.id,
            quantity: qty,
            locationId: line.restockLocationId,
          } as unknown as Prisma.InputJsonValue,
        },
        tx,
      );
    });
    revalidateReturns(line.returnRmaId);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Inventory post failed" };
  }
}
