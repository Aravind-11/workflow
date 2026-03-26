import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, "../.env"), quiet: true });
config({ path: resolve(dir, "../.env.local"), override: true, quiet: true });

import {
  DeliveryDirection,
  DeliveryStatus,
  DockAppointmentStatus,
  InventoryBalanceStatus,
  InventoryTransactionType,
  PackListStatus,
  PickListStatus,
  PrismaClient,
  PurchaseOrderStatus,
  ReceiptStatus,
  ReturnDisposition,
  ReturnStatus,
  ScheduleConfirmation,
  ScheduleStatus,
  ShipmentStatus,
  ShiftType,
  TaskStatus,
  TaskType,
  TimeOffStatus,
  WorkerStatus,
} from "@prisma/client";
import { addDays, addHours, startOfDay } from "date-fns";

const prisma = new PrismaClient();

const warehouses = [
  { code: "PHX-01", name: "Phoenix Distribution Center", state: "AZ", city: "Phoenix", region: "Southwest", zip: "85001", timezone: "America/Phoenix" },
  { code: "LAX-01", name: "Los Angeles Hub", state: "CA", city: "Los Angeles", region: "West", zip: "90001", timezone: "America/Los_Angeles" },
  { code: "DAL-01", name: "Dallas Fulfillment Center", state: "TX", city: "Dallas", region: "South Central", zip: "75201", timezone: "America/Chicago" },
  { code: "CHI-01", name: "Chicago Midwest DC", state: "IL", city: "Chicago", region: "Midwest", zip: "60601", timezone: "America/Chicago" },
  { code: "ATL-01", name: "Atlanta Southeast Hub", state: "GA", city: "Atlanta", region: "Southeast", zip: "30301", timezone: "America/New_York" },
];

const skuCategories = ["Consumables", "Equipment", "Packaging", "Raw", "Finished"];

const skuSeed = Array.from({ length: 20 }).map((_, idx) => ({
  skuCode: `SKU-${1000 + idx}`,
  name: `Demo Item ${idx + 1}`,
  barcode: `BC${100000 + idx}`,
  category: skuCategories[idx % skuCategories.length],
  reorderPoint: 15 + (idx % 6) * 5,
  uom: idx % 2 === 0 ? "EA" : "BOX",
  lotTracked: true,
  batchTracked: true,
  expiryTracked: idx % 3 === 0,
}));

const workerSeed = [
  ["Ava", "Lopez"], ["Noah", "Kim"], ["Mia", "Patel"], ["Liam", "Reed"], ["Ethan", "Nguyen"],
  ["Emma", "Santos"], ["Lucas", "Morris"], ["Olivia", "Clark"], ["Mason", "Hill"], ["Sophia", "Turner"],
];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.returnComment.deleteMany();
  await prisma.returnLine.deleteMany();
  await prisma.returnRMA.deleteMany();
  await prisma.packListLine.deleteMany();
  await prisma.packList.deleteMany();
  await prisma.pickListLine.deleteMany();
  await prisma.pickList.deleteMany();
  await prisma.shipmentLine.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.dockAppointment.deleteMany();
  await prisma.receiptLine.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.timeOffBlock.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.warehouseLocationHierarchy.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.warehouse.deleteMany();

  const createdRoles = await prisma.$transaction([
    prisma.role.create({ data: { name: "admin", description: "Full system access" } }),
    prisma.role.create({ data: { name: "warehouse_manager", description: "Warehouse manager" } }),
    prisma.role.create({ data: { name: "supervisor", description: "Floor supervisor" } }),
    prisma.role.create({ data: { name: "picker", description: "Picking operations" } }),
    prisma.role.create({ data: { name: "packer", description: "Packing operations" } }),
    prisma.role.create({ data: { name: "receiver", description: "Inbound receiving" } }),
    prisma.role.create({ data: { name: "dispatcher", description: "Shipping & dock coordination" } }),
    prisma.role.create({ data: { name: "viewer", description: "Read-only" } }),
  ]);
  const adminRole = createdRoles[0];
  const warehouseManagerRole = createdRoles[1];
  const viewerRole = createdRoles[7];

  const [adminUser, managerUser, viewerUser] = await prisma.$transaction([
    prisma.user.create({ data: { email: "admin@wms.demo", fullName: "Admin User" } }),
    prisma.user.create({ data: { email: "manager@wms.demo", fullName: "Warehouse Manager" } }),
    prisma.user.create({ data: { email: "viewer@wms.demo", fullName: "Read Only User" } }),
  ]);

  const items = await Promise.all(
    skuSeed.map((sku, i) =>
      prisma.inventoryItem.create({
        data: {
          ...sku,
          description: `Seeded SKU ${i + 1}`,
          unitWeightKg: (i + 1) * 0.25,
        },
      }),
    ),
  );

  const now = startOfDay(new Date());
  let globalWorkerIdx = 0;

  for (const [warehouseIdx, wh] of warehouses.entries()) {
    const warehouse = await prisma.warehouse.create({
      data: {
        code: wh.code,
        name: wh.name,
        country: "US",
        state: wh.state,
        city: wh.city,
        region: wh.region,
        zip: wh.zip,
        timezone: wh.timezone,
        openTime: "06:00",
        closeTime: "22:00",
        addressLine1: `${100 + warehouseIdx} Logistics Way`,
      },
    });

    await prisma.userRole.createMany({
      data: [
        { userId: adminUser.id, roleId: adminRole.id, warehouseId: warehouse.id },
        { userId: managerUser.id, roleId: warehouseManagerRole.id, warehouseId: warehouse.id },
        { userId: viewerUser.id, roleId: viewerRole.id, warehouseId: warehouse.id },
      ],
    });

    const locationA = await prisma.warehouseLocationHierarchy.create({
      data: { warehouseId: warehouse.id, zone: "A", aisle: "01", rack: "01", bin: "01", locationCode: "A-01-01-01" },
    });
    const locationB = await prisma.warehouseLocationHierarchy.create({
      data: { warehouseId: warehouse.id, zone: "A", aisle: "01", rack: "01", bin: "02", locationCode: "A-01-01-02" },
    });
    const locationDock = await prisma.warehouseLocationHierarchy.create({
      data: { warehouseId: warehouse.id, zone: "DOCK", aisle: "00", rack: "00", bin: "STAGE", locationCode: "DOCK-STAGE" },
    });

    const workerCountForWarehouse = 8;
    const warehouseWorkers = [];
    for (let i = 0; i < workerCountForWarehouse; i++) {
      const [firstName, lastName] = workerSeed[globalWorkerIdx % workerSeed.length];
      const worker = await prisma.workerProfile.create({
        data: {
          warehouseId: warehouse.id,
          employeeCode: `${wh.code}-${String(i + 1).padStart(3, "0")}`,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${wh.code.toLowerCase()}@wms.demo`,
          status: WorkerStatus.ACTIVE,
          certifications: ["Forklift", "Safety"],
        },
      });
      warehouseWorkers.push(worker);
      globalWorkerIdx += 1;
    }

    const morning = await prisma.shift.create({
      data: { warehouseId: warehouse.id, name: "1st Shift", shiftType: ShiftType.FIRST, startTime: "06:00", endTime: "14:00" },
    });
    const evening = await prisma.shift.create({
      data: { warehouseId: warehouse.id, name: "2nd Shift", shiftType: ShiftType.SECOND, startTime: "14:00", endTime: "22:00" },
    });

    for (const worker of warehouseWorkers) {
      await prisma.schedule.createMany({
        data: [
          {
            warehouseId: warehouse.id,
            workerProfileId: worker.id,
            shiftId: morning.id,
            scheduleDate: now,
            status: ScheduleStatus.ASSIGNED,
            confirmationStatus: ScheduleConfirmation.CONFIRMED,
            locationId: locationA.id,
            breakMinutes: 30,
            plannedStart: addHours(now, 6),
            plannedEnd: addHours(now, 14),
          },
          {
            warehouseId: warehouse.id,
            workerProfileId: worker.id,
            shiftId: evening.id,
            scheduleDate: addDays(now, 1),
            status: ScheduleStatus.PLANNED,
            confirmationStatus: ScheduleConfirmation.TENTATIVE,
            plannedStart: addHours(addDays(now, 1), 14),
            plannedEnd: addHours(addDays(now, 1), 22),
          },
        ],
      });
    }

    if (warehouseWorkers[0]) {
      await prisma.timeOffBlock.create({
        data: {
          workerProfileId: warehouseWorkers[0].id,
          warehouseId: warehouse.id,
          startAt: addDays(now, 7),
          endAt: addHours(addDays(now, 7), 8),
          reason: "PTO",
          status: TimeOffStatus.APPROVED,
        },
      });
      await prisma.timeOffBlock.create({
        data: {
          workerProfileId: warehouseWorkers[0].id,
          warehouseId: warehouse.id,
          startAt: addDays(now, 14),
          endAt: addHours(addDays(now, 14), 5),
          reason: "Appointment (pending approval)",
          status: TimeOffStatus.REQUESTED,
        },
      });
    }

    await prisma.inventoryBalance.createMany({
      data: [
        {
          warehouseId: warehouse.id,
          locationId: locationA.id,
          inventoryItemId: items[warehouseIdx].id,
          lotNumber: `LOT-${wh.code}-1`,
          batchNumber: `B-${warehouseIdx + 1}`,
          expiryDate: addDays(now, 180),
          status: InventoryBalanceStatus.AVAILABLE,
          onHandQty: 500,
          reservedQty: 40,
        },
        {
          warehouseId: warehouse.id,
          locationId: locationB.id,
          inventoryItemId: items[warehouseIdx + 5].id,
          lotNumber: `LOT-${wh.code}-2`,
          batchNumber: `B-${warehouseIdx + 6}`,
          expiryDate: addDays(now, 240),
          status: InventoryBalanceStatus.AVAILABLE,
          onHandQty: 300,
          reservedQty: 25,
        },
      ],
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        warehouseId: warehouse.id,
        poNumber: `PO-${wh.code}-1001`,
        supplierName: "Vertex Supply Co",
        status: PurchaseOrderStatus.PARTIAL,
        expectedDate: addDays(now, 2),
        lines: {
          create: [
            { inventoryItemId: items[(warehouseIdx + 1) % items.length].id, orderedQty: 120, receivedQty: 80, unitCostCents: 1250 },
            { inventoryItemId: items[(warehouseIdx + 2) % items.length].id, orderedQty: 60, receivedQty: 30, unitCostCents: 1825 },
          ],
        },
      },
      include: { lines: true },
    });

    const receipt = await prisma.receipt.create({
      data: {
        warehouseId: warehouse.id,
        purchaseOrderId: po.id,
        receiptNumber: `RCPT-${wh.code}-5001`,
        status: ReceiptStatus.POSTED,
        receivedAt: addHours(now, 9),
      },
    });

    await prisma.receiptLine.createMany({
      data: [
        {
          receiptId: receipt.id,
          purchaseOrderLineId: po.lines[0].id,
          inventoryItemId: po.lines[0].inventoryItemId,
          locationId: locationDock.id,
          receivedQty: 80,
          lotNumber: `LOT-${wh.code}-R1`,
          batchNumber: `RB-${warehouseIdx + 1}`,
          expiryDate: addDays(now, 200),
        },
        {
          receiptId: receipt.id,
          purchaseOrderLineId: po.lines[1].id,
          inventoryItemId: po.lines[1].inventoryItemId,
          locationId: locationDock.id,
          receivedQty: 30,
          lotNumber: `LOT-${wh.code}-R2`,
          batchNumber: `RB-${warehouseIdx + 2}`,
          expiryDate: addDays(now, 220),
        },
      ],
    });

    const appointment = await prisma.dockAppointment.create({
      data: {
        warehouseId: warehouse.id,
        appointmentCode: `DOCK-${wh.code}-01`,
        carrier: "UPS Freight",
        dockDoor: "D-02",
        scheduledStart: addHours(now, 8),
        scheduledEnd: addHours(now, 10),
        checkedInAt: addHours(now, 8),
        status: DockAppointmentStatus.CHECKED_IN,
      },
    });

    await prisma.delivery.create({
      data: {
        warehouseId: warehouse.id,
        dockAppointmentId: appointment.id,
        deliveryNumber: `DLV-${wh.code}-01`,
        direction: DeliveryDirection.INBOUND,
        carrier: "UPS Freight",
        status: DeliveryStatus.ARRIVED,
        scheduledAt: addHours(now, 8),
        arrivedAt: addHours(now, 8),
      },
    });

    const shipment = await prisma.shipment.create({
      data: {
        warehouseId: warehouse.id,
        dockAppointmentId: appointment.id,
        shipmentNumber: `SHP-${wh.code}-01`,
        salesOrderRef: `SO-${wh.code}-01`,
        carrier: "FedEx",
        serviceLevel: "Ground",
        trackingNumber: `TRK${warehouseIdx + 10000}`,
        status: ShipmentStatus.PICKED,
        plannedShipAt: addHours(now, 16),
      },
    });

    await prisma.shipmentLine.create({
      data: {
        shipmentId: shipment.id,
        inventoryItemId: items[(warehouseIdx + 3) % items.length].id,
        quantity: 42,
        lotNumber: `LOT-${wh.code}-S1`,
        batchNumber: `SB-${warehouseIdx + 1}`,
      },
    });

    const pickList = await prisma.pickList.create({
      data: {
        warehouseId: warehouse.id,
        shipmentId: shipment.id,
        assignedWorkerId: warehouseWorkers[0]?.id,
        pickListNumber: `PICK-${wh.code}-01`,
        status: PickListStatus.IN_PROGRESS,
        scheduledDate: now,
      },
    });

    await prisma.pickListLine.create({
      data: {
        pickListId: pickList.id,
        inventoryItemId: items[(warehouseIdx + 3) % items.length].id,
        fromLocationId: locationA.id,
        requestedQty: 42,
        pickedQty: 28,
        lotNumber: `LOT-${wh.code}-S1`,
        batchNumber: `SB-${warehouseIdx + 1}`,
      },
    });

    const packList = await prisma.packList.create({
      data: {
        warehouseId: warehouse.id,
        shipmentId: shipment.id,
        assignedWorkerId: warehouseWorkers[1]?.id ?? warehouseWorkers[0]?.id,
        packListNumber: `PACK-${wh.code}-01`,
        status: PackListStatus.OPEN,
      },
    });

    await prisma.packListLine.create({
      data: {
        packListId: packList.id,
        inventoryItemId: items[(warehouseIdx + 3) % items.length].id,
        packedQty: 20,
        lotNumber: `LOT-${wh.code}-S1`,
        batchNumber: `SB-${warehouseIdx + 1}`,
      },
    });

    const rma = await prisma.returnRMA.create({
      data: {
        warehouseId: warehouse.id,
        rmaNumber: `RMA-${wh.code}-01`,
        customerName: "Acme Retail",
        reason: "Damaged packaging",
        shipmentId: shipment.id,
        originalOrderRef: `SO-${wh.code}-01`,
        exceptionReasonCode: "DAMAGED",
        notes: "Customer reported outer carton crush. Awaiting QC.",
        status: ReturnStatus.QC,
        receivedAt: addHours(now, 12),
      },
    });

    await prisma.returnLine.create({
      data: {
        returnRmaId: rma.id,
        inventoryItemId: items[(warehouseIdx + 4) % items.length].id,
        quantity: 5,
        receivedQty: 5,
        disposition: "Repack",
        dispositionType: ReturnDisposition.QUARANTINE,
        dispositionNote: "Hold for inspection",
        lotNumber: `RET-${wh.code}-1`,
        batchNumber: `RB-${warehouseIdx + 1}`,
      },
    });

    await prisma.returnComment.create({
      data: {
        returnRmaId: rma.id,
        body: "Dock verified 5 units against RMA. Photos stored in #returns channel.",
        isInternal: true,
      },
    });

    await prisma.inventoryTransaction.createMany({
      data: [
        {
          warehouseId: warehouse.id,
          locationId: locationDock.id,
          inventoryItemId: po.lines[0].inventoryItemId,
          transactionType: InventoryTransactionType.RECEIPT,
          referenceType: "receipt",
          referenceId: receipt.id,
          quantityBefore: 0,
          quantityDelta: 80,
          quantityAfter: 80,
          lotNumber: `LOT-${wh.code}-R1`,
          batchNumber: `RB-${warehouseIdx + 1}`,
          performedById: managerUser.id,
        },
        {
          warehouseId: warehouse.id,
          locationId: locationA.id,
          inventoryItemId: items[(warehouseIdx + 3) % items.length].id,
          transactionType: InventoryTransactionType.PICK,
          referenceType: "pick_list",
          referenceId: pickList.id,
          quantityBefore: 120,
          quantityDelta: -28,
          quantityAfter: 92,
          lotNumber: `LOT-${wh.code}-S1`,
          batchNumber: `SB-${warehouseIdx + 1}`,
          performedById: managerUser.id,
        },
      ],
    });

    await prisma.task.createMany({
      data: [
        {
          warehouseId: warehouse.id,
          workerProfileId: warehouseWorkers[0]?.id,
          locationId: locationDock.id,
          title: "Complete inbound receiving validation",
          taskType: TaskType.RECEIPT,
          status: TaskStatus.IN_PROGRESS,
          priority: 1,
          dueDate: addHours(now, 11),
          relatedEntity: "receipt",
          relatedEntityId: receipt.id,
        },
        {
          warehouseId: warehouse.id,
          workerProfileId: warehouseWorkers[1]?.id ?? warehouseWorkers[0]?.id,
          locationId: locationA.id,
          title: "Finish pick list and handoff to packing",
          taskType: TaskType.PICK,
          status: TaskStatus.OPEN,
          priority: 2,
          dueDate: addHours(now, 15),
          relatedEntity: "pick_list",
          relatedEntityId: pickList.id,
        },
      ],
    });

    await prisma.auditLog.createMany({
      data: [
        {
          warehouseId: warehouse.id,
          userId: managerUser.id,
          entityType: "Warehouse",
          entityId: warehouse.id,
          action: "SEED_CREATED",
          newValues: { code: warehouse.code, state: warehouse.state },
        },
        {
          warehouseId: warehouse.id,
          userId: managerUser.id,
          entityType: "Shipment",
          entityId: shipment.id,
          action: "SEED_CREATED",
          newValues: { shipmentNumber: shipment.shipmentNumber, status: shipment.status },
        },
      ],
    });

  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
