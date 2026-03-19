"use server";

import { InventoryTransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { adjustStockSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateInventory } from "./shared";

export async function adjustStockAction(
  input: unknown,
  auditContext?: { userId?: string | null },
): Promise<ActionResult> {
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Invalid adjustment" };
  }
  const { balanceId, quantityDelta, reason } = parsed.data;

  const balCheck = await prisma.inventoryBalance.findUnique({ where: { id: balanceId } });
  if (!balCheck) return { ok: false, error: "Balance not found" };
  const auth = await guardAction(P.inventory.write, balCheck.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.inventoryBalance.findUniqueOrThrow({
        where: { id: balanceId },
        include: { inventoryItem: true },
      });

      const before = row.onHandQty;
      const after = before + quantityDelta;
      if (after < 0) {
        throw new Error("Adjustment would result in negative on-hand quantity");
      }

      await tx.inventoryBalance.update({
        where: { id: balanceId },
        data: { onHandQty: after },
      });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId: row.warehouseId,
          locationId: row.locationId,
          inventoryItemId: row.inventoryItemId,
          transactionType: InventoryTransactionType.ADJUSTMENT,
          referenceType: "adjustment",
          referenceId: balanceId,
          lotNumber: row.lotNumber,
          batchNumber: row.batchNumber,
          expiryDate: row.expiryDate,
          quantityBefore: before,
          quantityDelta: quantityDelta,
          quantityAfter: after,
          notes: reason,
          performedById: auditContext?.userId ?? undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auditContext?.userId ?? undefined,
          warehouseId: row.warehouseId,
          entityType: "InventoryBalance",
          entityId: balanceId,
          action: "ADJUST_STOCK",
          oldValues: { onHandQty: before } as unknown as Prisma.InputJsonValue,
          newValues: {
            onHandQty: after,
            reason,
            quantityDelta,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    });

    const bal = await prisma.inventoryBalance.findUnique({
      where: { id: balanceId },
      select: { inventoryItemId: true },
    });
    revalidateInventory(bal?.inventoryItemId);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Adjustment failed" };
  }
}
