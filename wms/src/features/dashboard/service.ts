import {
  DockAppointmentStatus,
  PickListStatus,
  PurchaseOrderStatus,
  ReceiptStatus,
  ReturnStatus,
  ShipmentStatus,
  TaskStatus,
  WarehouseStatus,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";

function startEndOfToday() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
}

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;

export type DashboardScope =
  | { mode: "admin" }
  | { mode: "operator"; warehouseId: string };

/**
 * Aggregate snapshot for the dashboard. In `admin` mode every counter is
 * cross-warehouse; in `operator` mode they're scoped to the selected
 * warehouseId so the floor team only sees their own KPIs.
 */
export async function getDashboardSnapshot(scope: DashboardScope = { mode: "admin" }) {
  const { dayStart, dayEnd } = startEndOfToday();
  const now = new Date();
  const dockHorizon = new Date(dayStart);
  dockHorizon.setDate(dockHorizon.getDate() + 3);

  const isOp = scope.mode === "operator";
  const whFilter = isOp ? { warehouseId: scope.warehouseId } : {};
  const whIdFilter = isOp ? { id: scope.warehouseId } : {};

  const [
    totalWarehouses,
    onHandSum,
    openPurchaseOrders,
    openReceipts,
    openShipments,
    todaysShiftCount,
    overdueTasks,
    dockAppointmentsToday,
    returnsAwaitingReview,
    warehousesBase,
    onHandByWarehouse,
    recentAudit,
    todaysSchedules,
    upcomingDocks,
    returnQueueSample,
  ] = await Promise.all([
    prisma.warehouse.count({ where: { status: WarehouseStatus.ACTIVE, ...whIdFilter } }),
    prisma.inventoryBalance.aggregate({ _sum: { onHandQty: true }, where: whFilter }),
    prisma.purchaseOrder.count({
      where: {
        status: { in: [PurchaseOrderStatus.OPEN, PurchaseOrderStatus.PARTIAL] },
        ...whFilter,
      },
    }),
    prisma.receipt.count({
      where: {
        status: { in: [ReceiptStatus.DRAFT, ReceiptStatus.RECEIVED] },
        ...whFilter,
      },
    }),
    prisma.shipment.count({
      where: {
        status: { in: [ShipmentStatus.CREATED, ShipmentStatus.PICKED, ShipmentStatus.PACKED] },
        ...whFilter,
      },
    }),
    prisma.schedule.count({
      where: { scheduleDate: { gte: dayStart, lt: dayEnd }, ...whFilter },
    }),
    prisma.task.count({
      where: {
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        dueDate: { lt: now },
        ...whFilter,
      },
    }),
    prisma.dockAppointment.count({
      where: {
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { not: DockAppointmentStatus.CANCELLED },
        ...whFilter,
      },
    }),
    prisma.returnRMA.count({
      where: {
        status: {
          in: [
            ReturnStatus.OPEN,
            ReturnStatus.AUTHORIZED,
            ReturnStatus.RECEIVED,
            ReturnStatus.QC,
          ],
        },
        ...whFilter,
      },
    }),
    prisma.warehouse.findMany({
      where: { status: WarehouseStatus.ACTIVE, ...whIdFilter },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        state: true,
        country: true,
        _count: {
          select: {
            shipments: {
              where: {
                status: {
                  in: [ShipmentStatus.CREATED, ShipmentStatus.PICKED, ShipmentStatus.PACKED],
                },
              },
            },
            tasks: {
              where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
            },
            pickLists: {
              where: { status: { in: [PickListStatus.OPEN, PickListStatus.IN_PROGRESS] } },
            },
            receipts: {
              where: { status: { in: [ReceiptStatus.DRAFT, ReceiptStatus.RECEIVED] } },
            },
          },
        },
      },
    }),
    prisma.inventoryBalance.groupBy({
      by: ["warehouseId"],
      _sum: { onHandQty: true },
      where: whFilter,
    }),
    prisma.auditLog.findMany({
      where: whFilter,
      orderBy: { createdAt: "desc" },
      // Floor view doesn't need 30 lines of audit; the cross-warehouse view
      // benefits from more context.
      take: isOp ? 12 : 30,
      include: {
        warehouse: { select: { code: true, name: true } },
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.schedule.findMany({
      where: { scheduleDate: { gte: dayStart, lt: dayEnd }, ...whFilter },
      include: {
        workerProfile: { select: { firstName: true, lastName: true, employeeCode: true } },
        shift: { select: { name: true, shiftType: true, startTime: true, endTime: true } },
        warehouse: { select: { code: true, name: true } },
      },
      orderBy: [{ plannedStart: "asc" }, { createdAt: "asc" }],
      take: isOp ? 12 : 24,
    }),
    prisma.dockAppointment.findMany({
      where: {
        scheduledStart: { gte: dayStart, lt: dockHorizon },
        status: { not: DockAppointmentStatus.CANCELLED },
        ...whFilter,
      },
      include: { warehouse: { select: { code: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 12,
    }),
    prisma.returnRMA.findMany({
      where: {
        status: {
          in: [
            ReturnStatus.OPEN,
            ReturnStatus.AUTHORIZED,
            ReturnStatus.RECEIVED,
            ReturnStatus.QC,
          ],
        },
        ...whFilter,
      },
      select: {
        id: true,
        rmaNumber: true,
        customerName: true,
        status: true,
        exceptionReasonCode: true,
        warehouse: { select: { code: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const whOnHand = new Map(onHandByWarehouse.map((r) => [r.warehouseId, r._sum.onHandQty ?? 0]));

  /** Low stock: SKU-level compare on-hand vs reorder point.
   *
   *  This is a 2-query sequential pass (after the parallel block) which
   *  pulls every reorder-tracked item and groups balances by item. For a
   *  warehouse like LACO-MAIL with thousands of inventoryItem + balance
   *  rows this can dominate dashboard load. The floor view doesn't surface
   *  it prominently anyway, so we only compute it for the cross-warehouse
   *  admin view. Operators get the rest of the snapshot ~hundreds of ms
   *  faster.
   */
  let lowStockCount = 0;
  let lowStockSamples: Array<{
    skuCode: string;
    name: string;
    onHand: number;
    reorderPoint: number;
  }> = [];
  if (!isOp) {
    const itemsWithReorder = await prisma.inventoryItem.findMany({
      where: { reorderPoint: { not: null } },
      select: { id: true, reorderPoint: true, skuCode: true, name: true },
    });
    const balByItem = await prisma.inventoryBalance.groupBy({
      by: ["inventoryItemId"],
      _sum: { onHandQty: true },
    });
    const balMap = new Map(balByItem.map((b) => [b.inventoryItemId, b._sum.onHandQty ?? 0]));
    const lowStockRows = itemsWithReorder.filter(
      (i) => (balMap.get(i.id) ?? 0) < (i.reorderPoint ?? 0),
    );
    lowStockCount = lowStockRows.length;
    lowStockSamples = lowStockRows.slice(0, 6).map((i) => ({
      skuCode: i.skuCode,
      name: i.name,
      onHand: balMap.get(i.id) ?? 0,
      reorderPoint: i.reorderPoint ?? 0,
    }));
  }

  const warehousePerformance = warehousesBase.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    city: w.city,
    state: w.state,
    country: w.country,
    onHandUnits: whOnHand.get(w.id) ?? 0,
    openShipments: w._count.shipments,
    activeTasks: w._count.tasks,
    openPickLists: w._count.pickLists,
    openReceipts: w._count.receipts,
  }));

  const inventoryOnHand = onHandSum._sum.onHandQty ?? 0;

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalWarehouses,
      inventoryOnHand,
      lowStockCount,
      openPurchaseOrders,
      openReceipts,
      openShipments,
      todaysShifts: todaysShiftCount,
      overdueTasks,
      dockAppointmentsToday,
      returnsAwaitingReview,
    },
    lowStockSamples,
    warehousePerformance,
    recentAudit,
    todaysSchedules,
    upcomingDocks,
    returnQueueSample,
  };
}
