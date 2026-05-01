"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

interface CreateOrderInput {
  warehouseId: string;
  projectId?: string;
  customerName: string;
  priority?: number;
  requestedShipDate?: string;
  lines: { inventoryItemId: string; qtyOrdered: number }[];
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const guard = await guardAction(P.shipping.manage, input.warehouseId);
  if (!guard.ok) return guard;

  if (!input.lines.length) {
    return { ok: false, error: "At least one line item is required" };
  }

  const orderNumber = `SO-${nanoid(8).toUpperCase()}`;

  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      warehouseId: input.warehouseId,
      projectId: input.projectId ?? null,
      customerName: input.customerName,
      priority: input.priority ?? 5,
      requestedShipDate: input.requestedShipDate
        ? new Date(input.requestedShipDate)
        : null,
      lines: {
        create: input.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          qtyOrdered: l.qtyOrdered,
        })),
      },
    },
  });

  revalidatePath("/orders");
  return { ok: true, data: { orderId: order.id, orderNumber } };
}

export async function updateOrderStatusAction(
  orderId: string,
  status: "ALLOCATED" | "PICKING" | "PACKED" | "SHIPPED" | "CANCELLED",
): Promise<ActionResult> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: { warehouseId: true },
  });
  if (!order) return { ok: false, error: "Order not found" };

  const guard = await guardAction(P.shipping.manage, order.warehouseId);
  if (!guard.ok) return guard;

  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

interface CreatePurchaseOrderInput {
  warehouseId: string;
  supplierName: string;
  expectedDate?: string;
  lines: { inventoryItemId: string; orderedQty: number; unitCost?: number }[];
}

export async function createPurchaseOrderAction(
  input: CreatePurchaseOrderInput,
): Promise<ActionResult<{ poId: string; poNumber: string }>> {
  const guard = await guardAction(P.receiving.manage, input.warehouseId);
  if (!guard.ok) return guard;

  if (!input.lines.length) {
    return { ok: false, error: "At least one line item is required" };
  }

  const poNumber = `PO-${nanoid(8).toUpperCase()}`;

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      warehouseId: input.warehouseId,
      supplierName: input.supplierName,
      expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
      lines: {
        create: input.lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          orderedQty: l.orderedQty,
          unitCost: l.unitCost ?? null,
        })),
      },
    },
  });

  revalidatePath("/purchase-orders");
  return { ok: true, data: { poId: po.id, poNumber } };
}
