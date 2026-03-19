import { ReturnStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export async function listReturnQueue(filters: {
  warehouseId?: string;
  status?: ReturnStatus;
  search?: string;
}) {
  const search = filters.search?.trim();
  return prisma.returnRMA.findMany({
    where: {
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { rmaNumber: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { originalOrderRef: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      warehouse: { select: { code: true, name: true } },
      shipment: { select: { shipmentNumber: true, salesOrderRef: true } },
      lines: { select: { id: true, quantity: true, receivedQty: true, dispositionType: true } },
    },
  });
}

export async function getReturnDetail(id: string) {
  return prisma.returnRMA.findUnique({
    where: { id },
    include: {
      warehouse: true,
      shipment: {
        include: {
          shipmentLines: { include: { inventoryItem: { select: { skuCode: true, name: true } } } },
        },
      },
      lines: {
        include: {
          inventoryItem: true,
          restockLocation: { select: { id: true, locationCode: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });
}

export async function listReturnAuditEntries(returnRmaId: string) {
  return prisma.auditLog.findMany({
    where: { entityType: "ReturnRMA", entityId: returnRmaId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listWarehousesSelect() {
  return prisma.warehouse.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

export async function listShipmentsForWarehouse(warehouseId: string) {
  return prisma.shipment.findMany({
    where: { warehouseId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      shipmentNumber: true,
      salesOrderRef: true,
      status: true,
    },
  });
}

export async function listLocationsForWarehouse(warehouseId: string) {
  return prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId, isActive: true },
    select: { id: true, locationCode: true, zone: true },
    orderBy: { locationCode: "asc" },
    take: 500,
  });
}

export async function listSkus(take = 300) {
  return prisma.inventoryItem.findMany({
    select: { id: true, skuCode: true, name: true },
    orderBy: { skuCode: "asc" },
    take,
  });
}

export async function listRecentShipmentsForRma(take = 400) {
  return prisma.shipment.findMany({
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      warehouseId: true,
      shipmentNumber: true,
      salesOrderRef: true,
    },
  });
}
