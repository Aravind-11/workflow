import { prisma } from "@/server/db/prisma";
import { WarehouseStatus } from "@prisma/client";
import { normalizeFilterValue, type WarehouseFilterInput } from "./schemas";
import type { WarehouseDetailData, WarehouseDirectoryResponse } from "./types";

function pickDistinct(items: string[]) {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

export async function listWarehouses(filters: WarehouseFilterInput): Promise<WarehouseDirectoryResponse> {
  const search = normalizeFilterValue(filters.search);

  try {
    const warehouses = await prisma.warehouse.findMany({
      where: {
        status: WarehouseStatus.ACTIVE,
        country: normalizeFilterValue(filters.country),
        state: normalizeFilterValue(filters.state),
        region: normalizeFilterValue(filters.region),
        city: normalizeFilterValue(filters.city),
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        inventoryBalance: {
          select: { onHandQty: true },
        },
      },
      orderBy: [{ country: "asc" }, { state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    const mapped = warehouses.map((warehouse) => {
      const totalQty = warehouse.inventoryBalance.reduce((sum, row) => sum + row.onHandQty, 0);
      const utilizationPercent = totalQty > 0 ? Math.max(1, Math.min(99, Math.round(totalQty / 100))) : null;

      return {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        country: warehouse.country,
        state: warehouse.state,
        region: warehouse.region,
        city: warehouse.city,
        zip: warehouse.zip,
        timezone: warehouse.timezone,
        openTime: warehouse.openTime,
        closeTime: warehouse.closeTime,
        capacitySqft: null,
        utilizationPercent,
        status: warehouse.status,
      };
    });

    return {
      warehouses: mapped,
      facets: {
        countries: pickDistinct(mapped.map((item) => item.country)),
        states: pickDistinct(mapped.map((item) => item.state)),
        regions: pickDistinct(mapped.map((item) => item.region).filter(Boolean) as string[]),
        cities: pickDistinct(mapped.map((item) => item.city)),
      },
    };
  } catch (e) {
    console.error("listWarehouses", e);
    return {
      warehouses: [],
      facets: { countries: [], states: [], regions: [], cities: [] },
    };
  }
}

export async function getWarehouseDetail(warehouseId: string): Promise<WarehouseDetailData | null> {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) return null;

    const [inventorySummary, workerSchedule, deliveries, receipts, returns, openTasks, dockAppointments] =
      await Promise.all([
        prisma.inventoryBalance.findMany({
          where: { warehouseId },
          include: { inventoryItem: true },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.schedule.findMany({
          where: { warehouseId },
          include: { workerProfile: true, shift: true },
          orderBy: [{ scheduleDate: "asc" }],
          take: 12,
        }),
        prisma.delivery.findMany({
          where: { warehouseId },
          orderBy: { scheduledAt: "desc" },
          take: 8,
        }),
        prisma.receipt.findMany({
          where: { warehouseId },
          include: { purchaseOrder: true },
          orderBy: { receivedAt: "desc" },
          take: 8,
        }),
        prisma.returnRMA.findMany({
          where: { warehouseId },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.task.findMany({
          where: { warehouseId, status: { in: ["OPEN", "IN_PROGRESS"] } },
          orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
          take: 10,
        }),
        prisma.dockAppointment.findMany({
          where: { warehouseId },
          orderBy: { scheduledStart: "desc" },
          take: 8,
        }),
      ]);

    return {
      warehouse: {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        country: warehouse.country,
        state: warehouse.state,
        region: warehouse.region,
        city: warehouse.city,
        zip: warehouse.zip,
        timezone: warehouse.timezone,
        openTime: warehouse.openTime,
        closeTime: warehouse.closeTime,
        capacitySqft: null,
        utilizationPercent: null,
        status: warehouse.status,
      },
      inventorySummary: inventorySummary.map((row) => ({
        skuCode: row.inventoryItem.skuCode,
        skuName: row.inventoryItem.name,
        onHandQty: row.onHandQty,
        reservedQty: row.reservedQty,
        lotNumber: row.lotNumber,
        expiryDate: row.expiryDate?.toISOString() ?? null,
      })),
      workerSchedule: workerSchedule.map((row) => ({
        workerName: `${row.workerProfile.firstName} ${row.workerProfile.lastName}`,
        shiftName: row.shift.name,
        scheduleDate: row.scheduleDate.toISOString(),
        status: row.status,
      })),
      deliveries: deliveries.map((row) => ({
        deliveryNumber: row.deliveryNumber,
        direction: row.direction,
        carrier: row.carrier,
        status: row.status,
        scheduledAt: row.scheduledAt.toISOString(),
      })),
      receipts: receipts.map((row) => ({
        receiptNumber: row.receiptNumber,
        status: row.status,
        receivedAt: row.receivedAt.toISOString(),
        supplierName: row.purchaseOrder?.supplierName ?? null,
      })),
      returns: returns.map((row) => ({
        rmaNumber: row.rmaNumber,
        customerName: row.customerName,
        status: row.status,
        receivedAt: row.receivedAt?.toISOString() ?? null,
      })),
      openTasks: openTasks.map((row) => ({
        title: row.title,
        taskType: row.taskType,
        status: row.status,
        dueDate: row.dueDate?.toISOString() ?? null,
      })),
      dockAppointments: dockAppointments.map((row) => ({
        appointmentCode: row.appointmentCode,
        carrier: row.carrier,
        dockDoor: row.dockDoor,
        status: row.status,
        scheduledStart: row.scheduledStart.toISOString(),
        scheduledEnd: row.scheduledEnd.toISOString(),
      })),
    };
  } catch (e) {
    console.error("getWarehouseDetail", e);
    return null;
  }
}
