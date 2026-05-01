import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local") });
const prisma = new PrismaClient();

async function main() {
  const wh = await prisma.warehouse.findUnique({ where: { code: "LACO-MAIL" } });
  if (!wh) throw new Error("LACO-MAIL not found");

  const counts = {
    receipts: await prisma.receipt.count({ where: { warehouseId: wh.id } }),
    receiptsWithNotes: await prisma.receipt.count({ where: { warehouseId: wh.id, notes: { contains: "Operator" } } }),
    pickListLinesWithBatch: await prisma.pickListLine.count({ where: { batchNumber: { not: null }, pickList: { warehouseId: wh.id } } }),
    pickListLinesWithMachine: await prisma.pickListLine.count({ where: { lotNumber: { not: null }, pickList: { warehouseId: wh.id } } }),
    packListLinesWithBatch: await prisma.packListLine.count({ where: { batchNumber: { not: null }, packList: { warehouseId: wh.id } } }),
    packListLinesWithResult: await prisma.packListLine.count({ where: { lotNumber: { in: ["RESCAN", "OK"] }, packList: { warehouseId: wh.id } } }),
    shipmentsWithPages: await prisma.shipment.count({ where: { warehouseId: wh.id, serviceLevel: { contains: "pages" } } }),
    shipmentsWithExportId: await prisma.shipment.count({ where: { warehouseId: wh.id, trackingNumber: { not: null } } }),
    batchTasks: await prisma.task.count({ where: { warehouseId: wh.id, taskType: "RECEIPT", title: { startsWith: "Batch " } } }),
  };
  console.log(counts);

  const sampleShip = await prisma.shipment.findFirst({
    where: { warehouseId: wh.id },
    select: { shipmentNumber: true, salesOrderRef: true, carrier: true, serviceLevel: true, trackingNumber: true },
  });
  console.log("\nSample shipment:", sampleShip);

  const samplePickLine = await prisma.pickListLine.findFirst({
    where: { pickList: { warehouseId: wh.id } },
    select: { batchNumber: true, lotNumber: true, inventoryItem: { select: { skuCode: true } } },
  });
  console.log("Sample pick line:", samplePickLine);

  const samplePackLine = await prisma.packListLine.findFirst({
    where: { packList: { warehouseId: wh.id } },
    select: { batchNumber: true, lotNumber: true, inventoryItem: { select: { skuCode: true } } },
  });
  console.log("Sample pack line:", samplePackLine);

  const sampleBatchTask = await prisma.task.findFirst({
    where: { warehouseId: wh.id, taskType: "RECEIPT", title: { startsWith: "Batch " } },
    select: { title: true, status: true, completedAt: true, workerProfile: { select: { firstName: true, lastName: true } } },
  });
  console.log("Sample batch task:", sampleBatchTask);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
