import { DeliveryDirection, PurchaseOrderStatus, WorkerStatus } from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";
import { prisma } from "@/server/db/prisma";

export async function listWarehousesForSelect() {
  return prisma.warehouse.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

export async function listReceipts(warehouseId?: string) {
  return prisma.receipt.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: { receivedAt: "desc" },
    take: 100,
    include: {
      warehouse: { select: { code: true, name: true } },
      purchaseOrder: { select: { poNumber: true, supplierName: true, status: true } },
      delivery: { select: { deliveryNumber: true, status: true } },
      lines: { include: { inventoryItem: { select: { skuCode: true, name: true } } } },
    },
  });
}

export async function getReceipt(id: string) {
  return prisma.receipt.findUnique({
    where: { id },
    include: {
      warehouse: true,
      purchaseOrder: { include: { lines: { include: { inventoryItem: true } } } },
      delivery: true,
      lines: {
        include: {
          inventoryItem: true,
          location: { select: { locationCode: true } },
          purchaseOrderLine: true,
        },
      },
    },
  });
}

export async function listPurchaseOrders(warehouseId: string) {
  return prisma.purchaseOrder.findMany({
    where: { warehouseId, status: { not: PurchaseOrderStatus.CANCELLED } },
    orderBy: { orderedAt: "desc" },
    take: 50,
    include: {
      lines: { include: { inventoryItem: { select: { id: true, skuCode: true, name: true } } } },
    },
  });
}

export async function listInboundDeliveries(warehouseId: string) {
  return prisma.delivery.findMany({
    where: { warehouseId, direction: DeliveryDirection.INBOUND },
    orderBy: { scheduledAt: "desc" },
    take: 50,
  });
}

export async function listShipments(warehouseId?: string) {
  return prisma.shipment.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      warehouse: { select: { code: true } },
      shipmentLines: { include: { inventoryItem: { select: { skuCode: true } } } },
      pickLists: { select: { id: true, pickListNumber: true, status: true } },
      packLists: { select: { id: true, packListNumber: true, status: true } },
    },
  });
}

export async function getShipment(id: string) {
  return prisma.shipment.findUnique({
    where: { id },
    include: {
      warehouse: true,
      dockAppointment: true,
      shipmentLines: { include: { inventoryItem: true } },
      pickLists: {
        include: {
          lines: { include: { inventoryItem: true, fromLocation: { select: { locationCode: true } } } },
          assignedWorker: { select: { firstName: true, lastName: true } },
        },
      },
      packLists: {
        include: {
          lines: { include: { inventoryItem: true } },
          assignedWorker: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export async function listPickLists(warehouseId?: string) {
  return prisma.pickList.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: { scheduledDate: "desc" },
    take: 100,
    include: {
      warehouse: { select: { code: true } },
      shipment: { select: { shipmentNumber: true, status: true } },
      assignedWorker: { select: { firstName: true, lastName: true, employeeCode: true } },
      lines: { include: { inventoryItem: { select: { skuCode: true, name: true } } } },
    },
  });
}

export async function getPickList(id: string) {
  return prisma.pickList.findUnique({
    where: { id },
    include: {
      warehouse: true,
      shipment: true,
      assignedWorker: true,
      lines: { include: { inventoryItem: true, fromLocation: true } },
    },
  });
}

export async function listPackLists(warehouseId?: string) {
  return prisma.packList.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      warehouse: { select: { code: true } },
      shipment: { select: { shipmentNumber: true, status: true, carrier: true } },
      assignedWorker: { select: { firstName: true, lastName: true } },
      lines: { include: { inventoryItem: { select: { skuCode: true } } } },
    },
  });
}

export async function getPackList(id: string) {
  return prisma.packList.findUnique({
    where: { id },
    include: {
      warehouse: true,
      shipment: true,
      assignedWorker: true,
      lines: { include: { inventoryItem: true } },
    },
  });
}

export async function listDockAppointments(warehouseId: string, weekStart: Date) {
  const from = startOfWeek(weekStart, { weekStartsOn: 1 });
  const to = endOfWeek(weekStart, { weekStartsOn: 1 });
  return prisma.dockAppointment.findMany({
    where: {
      warehouseId,
      AND: [{ scheduledStart: { lte: to } }, { scheduledEnd: { gte: from } }],
    },
    orderBy: { scheduledStart: "asc" },
    include: {
      warehouse: { select: { code: true } },
      deliveries: { select: { id: true, deliveryNumber: true, status: true, direction: true } },
      shipments: { select: { id: true, shipmentNumber: true, status: true } },
    },
  });
}

export async function listDeliveries(warehouseId?: string) {
  return prisma.delivery.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      warehouse: { select: { code: true, name: true } },
      dockAppointment: { select: { appointmentCode: true, dockDoor: true, scheduledStart: true } },
    },
  });
}

export async function getDelivery(id: string) {
  return prisma.delivery.findUnique({
    where: { id },
    include: {
      warehouse: true,
      dockAppointment: true,
      receipts: { select: { id: true, receiptNumber: true, status: true } },
    },
  });
}

export async function listInventoryItemsLite(take = 200) {
  return prisma.inventoryItem.findMany({
    select: { id: true, skuCode: true, name: true },
    orderBy: { skuCode: "asc" },
    take,
  });
}

export async function listLocations(warehouseId: string) {
  return prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId, isActive: true },
    select: { id: true, locationCode: true },
    orderBy: { locationCode: "asc" },
    take: 500,
  });
}

export async function listWorkersLite(warehouseId: string) {
  return prisma.workerProfile.findMany({
    where: { warehouseId, status: WorkerStatus.ACTIVE },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
    orderBy: { lastName: "asc" },
  });
}
