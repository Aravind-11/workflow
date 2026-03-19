"use server";

import { InventoryTransactionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { moveStockSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateInventory } from "./shared";

export async function moveStockAction(input: unknown): Promise<ActionResult> {
  const parsed = moveStockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid move parameters" };
  }
  const { balanceId, toLocationId, quantity } = parsed.data;
  const bal0 = await prisma.inventoryBalance.findUnique({ where: { id: balanceId } });
  if (!bal0) return { ok: false, error: "Balance not found" };
  const auth = await guardAction(P.inventory.write, bal0.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    let itemIdForRevalidate = "";
    await prisma.$transaction(async (tx) => {
      const source = await tx.inventoryBalance.findUniqueOrThrow({
        where: { id: balanceId },
        include: { location: true, inventoryItem: true },
      });
      itemIdForRevalidate = source.inventoryItemId;

      if (source.locationId === toLocationId) {
        throw new Error("Source and destination must differ");
      }
      if (source.onHandQty < quantity) {
        throw new Error("Insufficient quantity at source location");
      }

      const dest = await tx.inventoryBalance.findFirst({
        where: {
          warehouseId: source.warehouseId,
          locationId: toLocationId,
          inventoryItemId: source.inventoryItemId,
          lotNumber: source.lotNumber,
          batchNumber: source.batchNumber,
        },
      });

      const srcBefore = source.onHandQty;
      const srcAfter = srcBefore - quantity;
      await tx.inventoryBalance.update({
        where: { id: source.id },
        data: { onHandQty: srcAfter },
      });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId: source.warehouseId,
          locationId: source.locationId,
          inventoryItemId: source.inventoryItemId,
          transactionType: InventoryTransactionType.TRANSFER,
          referenceType: "move",
          referenceId: source.id,
          lotNumber: source.lotNumber,
          batchNumber: source.batchNumber,
          expiryDate: source.expiryDate,
          quantityBefore: srcBefore,
          quantityDelta: -quantity,
          quantityAfter: srcAfter,
          notes: `Transfer out → location ${toLocationId}`,
        },
      });

      const destBefore = dest?.onHandQty ?? 0;
      const destAfter = destBefore + quantity;

      if (dest) {
        await tx.inventoryBalance.update({
          where: { id: dest.id },
          data: { onHandQty: destAfter },
        });
      } else {
        await tx.inventoryBalance.create({
          data: {
            warehouseId: source.warehouseId,
            locationId: toLocationId,
            inventoryItemId: source.inventoryItemId,
            lotNumber: source.lotNumber,
            batchNumber: source.batchNumber,
            expiryDate: source.expiryDate,
            onHandQty: quantity,
            reservedQty: 0,
            status: source.status,
          },
        });
      }

      await tx.inventoryTransaction.create({
        data: {
          warehouseId: source.warehouseId,
          locationId: toLocationId,
          inventoryItemId: source.inventoryItemId,
          transactionType: InventoryTransactionType.TRANSFER,
          referenceType: "move",
          referenceId: source.id,
          lotNumber: source.lotNumber,
          batchNumber: source.batchNumber,
          expiryDate: source.expiryDate,
          quantityBefore: destBefore,
          quantityDelta: quantity,
          quantityAfter: destAfter,
          notes: `Transfer in ← location ${source.locationId}`,
        },
      });
    });

    revalidateInventory(itemIdForRevalidate || undefined);
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Move failed" };
  }
}
