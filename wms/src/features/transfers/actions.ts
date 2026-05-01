"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

interface CreateTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: { inventoryItemId: string; qty: number; trackingItemId?: string }[];
}

export async function createTransferAction(
  input: CreateTransferInput,
): Promise<ActionResult<{ transferId: string; transferNumber: string }>> {
  const guard = await guardAction(P.transfers.manage, input.fromWarehouseId);
  if (!guard.ok) return guard;

  if (!input.lines.length) {
    return { ok: false, error: "At least one line is required" };
  }

  if (input.fromWarehouseId === input.toWarehouseId) {
    return { ok: false, error: "Source and destination must differ" };
  }

  const transferNumber = `TR-${nanoid(8).toUpperCase()}`;

  const transfer = await prisma.transferOrder.create({
    data: {
      transferNumber,
      fromWarehouseId: input.fromWarehouseId,
      toWarehouseId: input.toWarehouseId,
      lines: {
        create: input.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          qty: l.qty,
          trackingItemId: l.trackingItemId ?? null,
        })),
      },
    },
  });

  revalidatePath("/transfers");
  return { ok: true, data: { transferId: transfer.id, transferNumber } };
}

export async function updateTransferStatusAction(
  transferId: string,
  status: "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED",
): Promise<ActionResult> {
  const transfer = await prisma.transferOrder.findUnique({
    where: { id: transferId },
    include: { lines: true },
  });
  if (!transfer) return { ok: false, error: "Transfer not found" };

  const guard = await guardAction(P.transfers.manage, transfer.fromWarehouseId);
  if (!guard.ok) return guard;

  await prisma.transferOrder.update({
    where: { id: transferId },
    data: { status },
  });

  if (status === "RECEIVED") {
    for (const line of transfer.lines) {
      if (line.trackingItemId) {
        await prisma.trackingEvent.create({
          data: {
            trackingItemId: line.trackingItemId,
            stageType: "transfer_receive",
            stageLabel: "Transfer Received",
            barcode: `${transfer.transferNumber}-RECV-${nanoid(4)}`,
            notes: `Transferred from warehouse ${transfer.fromWarehouseId}`,
          },
        });
      }
    }
  }

  revalidatePath("/transfers");
  revalidatePath(`/transfers/${transferId}`);
  return { ok: true };
}

export async function listTransfers(warehouseId?: string) {
  return prisma.transferOrder.findMany({
    where: warehouseId
      ? {
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId },
          ],
        }
      : {},
    include: {
      lines: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
