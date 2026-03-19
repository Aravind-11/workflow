"use server";

import { InventoryBalanceStatus, InventoryTransactionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { receiveStockSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { normLot, revalidateInventory } from "./shared";

export async function receiveStockAction(input: unknown): Promise<ActionResult<{ balanceId: string }>> {
  const parsed = receiveStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.quantity?.[0] ?? "Invalid input" };
  }
  const {
    warehouseId,
    locationId,
    inventoryItemId,
    quantity,
    lotNumber,
    batchNumber,
    expiryDate,
  } = parsed.data;
  const lot = normLot(lotNumber);
  const batch = normLot(batchNumber);
  const expiry =
    expiryDate && String(expiryDate).trim()
      ? new Date(expiryDate as string)
      : null;
  if (expiry && Number.isNaN(expiry.getTime())) {
    return { ok: false, error: "Invalid expiry date" };
  }

  const auth = await guardAction(P.inventory.write, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryBalance.findFirst({
        where: {
          warehouseId,
          locationId,
          inventoryItemId,
          lotNumber: lot,
          batchNumber: batch,
        },
      });

      const before = existing?.onHandQty ?? 0;
      const after = before + quantity;

      const balance = existing
        ? await tx.inventoryBalance.update({
            where: { id: existing.id },
            data: { onHandQty: after },
          })
        : await tx.inventoryBalance.create({
            data: {
              warehouseId,
              locationId,
              inventoryItemId,
              lotNumber: lot,
              batchNumber: batch,
              expiryDate: expiry,
              onHandQty: quantity,
              reservedQty: 0,
              status: InventoryBalanceStatus.AVAILABLE,
            },
          });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId,
          locationId,
          inventoryItemId,
          transactionType: InventoryTransactionType.RECEIPT,
          referenceType: "receive",
          referenceId: balance.id,
          lotNumber: lot,
          batchNumber: batch,
          expiryDate: expiry,
          quantityBefore: before,
          quantityDelta: quantity,
          quantityAfter: after,
          notes: "Inbound receipt",
        },
      });

      return balance;
    });

    revalidateInventory(parsed.data.inventoryItemId);
    return { ok: true, data: { balanceId: result.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Receive failed" };
  }
}
