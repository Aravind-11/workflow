"use server";

import { PurchaseOrderStatus, ReceiptStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createReceiptSchema, receiptLineSchema, updateReceiptLineSchema, updateReceiptSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export async function createReceiptAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid receipt" };
  const { warehouseId, purchaseOrderId, deliveryId, notes } = parsed.data;
  const auth = await guardAction(P.receiving.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!wh) return { ok: false, error: "Warehouse not found" };
    if (purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, warehouseId },
      });
      if (!po) return { ok: false, error: "PO not in warehouse" };
    }
    if (deliveryId) {
      const d = await prisma.delivery.findFirst({
        where: { id: deliveryId, warehouseId },
      });
      if (!d) return { ok: false, error: "Delivery not in warehouse" };
    }
    const receiptNumber = await nextDoc("RCPT", wh.code);
    const r = await prisma.receipt.create({
      data: {
        warehouseId,
        purchaseOrderId: purchaseOrderId ?? null,
        deliveryId: deliveryId ?? null,
        notes: notes ?? null,
        receiptNumber,
        status: ReceiptStatus.DRAFT,
      },
    });
    revalidateLogisticsPages();
    return { ok: true, data: { id: r.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function updateReceiptAction(input: unknown): Promise<ActionResult> {
  const parsed = updateReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { id, ...rest } = parsed.data;
  const existing = await prisma.receipt.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.receiving.manage, existing.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.receipt.update({
    where: { id },
    data: {
      status: rest.status,
      notes: rest.notes === undefined ? undefined : rest.notes,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}

export async function addReceiptLineAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = receiptLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid line" };
  const data = parsed.data;
  const receipt = await prisma.receipt.findUnique({ where: { id: data.receiptId } });
  if (!receipt || receipt.status === ReceiptStatus.POSTED || receipt.status === ReceiptStatus.CANCELLED) {
    return { ok: false, error: "Receipt cannot be edited" };
  }
  const auth = await guardAction(P.receiving.manage, receipt.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const line = await prisma.receiptLine.create({
      data: {
        receiptId: data.receiptId,
        purchaseOrderLineId: data.purchaseOrderLineId ?? null,
        inventoryItemId: data.inventoryItemId,
        locationId: data.locationId ?? null,
        receivedQty: data.receivedQty,
        lotNumber: data.lotNumber ?? null,
        batchNumber: data.batchNumber ?? null,
        expiryDate:
          data.expiryDate && String(data.expiryDate).trim()
            ? new Date(data.expiryDate)
            : null,
        condition: data.condition,
        inboundStatus: data.inboundStatus,
      },
    });
    await prisma.receipt.update({
      where: { id: data.receiptId },
      data: { status: ReceiptStatus.RECEIVED },
    });
    revalidateLogisticsPages();
    return { ok: true, data: { id: line.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function updateReceiptLineAction(input: unknown): Promise<ActionResult> {
  const parsed = updateReceiptLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const { id, ...rest } = parsed.data;
  const line = await prisma.receiptLine.findUnique({
    where: { id },
    include: { receipt: true },
  });
  if (!line || line.receipt.status === ReceiptStatus.POSTED) {
    return { ok: false, error: "Cannot edit posted receipt line" };
  }
  const auth = await guardAction(P.receiving.manage, line.receipt.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.receiptLine.update({
    where: { id },
    data: {
      receivedQty: rest.receivedQty,
      condition: rest.condition,
      inboundStatus: rest.inboundStatus,
      locationId: rest.locationId === undefined ? undefined : rest.locationId,
      lotNumber: rest.lotNumber === undefined ? undefined : rest.lotNumber,
      batchNumber: rest.batchNumber === undefined ? undefined : rest.batchNumber,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}

export async function postReceiptAction(receiptId: string): Promise<ActionResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { lines: true },
  });
  if (!receipt) return { ok: false, error: "Not found" };
  if (receipt.status === ReceiptStatus.POSTED) return { ok: false, error: "Already posted" };
  if (receipt.lines.length === 0) return { ok: false, error: "Add lines before posting" };
  const auth = await guardAction(P.receiving.manage, receipt.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of receipt.lines) {
        if (line.purchaseOrderLineId) {
          await tx.purchaseOrderLine.update({
            where: { id: line.purchaseOrderLineId },
            data: {
              receivedQty: { increment: line.receivedQty },
            },
          });
        }
      }

      if (receipt.purchaseOrderId) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: receipt.purchaseOrderId },
          include: { lines: true },
        });
        if (po) {
          const allReceived = po.lines.every((l) => l.receivedQty >= l.orderedQty);
          const anyReceived = po.lines.some((l) => l.receivedQty > 0);
          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: allReceived
                ? PurchaseOrderStatus.RECEIVED
                : anyReceived
                  ? PurchaseOrderStatus.PARTIAL
                  : po.status,
            },
          });
        }
      }

      await tx.receipt.update({
        where: { id: receiptId },
        data: { status: ReceiptStatus.POSTED },
      });
    });
    revalidateLogisticsPages();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Post failed" };
  }
}
