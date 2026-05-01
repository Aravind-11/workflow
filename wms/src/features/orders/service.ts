import { prisma } from "@/server/db/prisma";
import type { OrderStatus } from "@prisma/client";

export async function listOrders(
  warehouseId: string,
  status?: OrderStatus,
) {
  return prisma.salesOrder.findMany({
    where: {
      warehouseId,
      ...(status ? { status } : {}),
    },
    include: {
      lines: {
        include: {
          inventoryItem: { select: { skuCode: true, name: true } },
        },
      },
      warehouse: { select: { code: true, name: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function getOrder(id: string) {
  return prisma.salesOrder.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          inventoryItem: { select: { skuCode: true, name: true, uom: true } },
        },
      },
      warehouse: { select: { code: true, name: true } },
    },
  });
}

export async function listPurchaseOrdersFull(warehouseId: string) {
  return prisma.purchaseOrder.findMany({
    where: { warehouseId },
    include: {
      lines: {
        include: {
          inventoryItem: { select: { skuCode: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
