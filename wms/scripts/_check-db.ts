import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local") });
const prisma = new PrismaClient();

async function main() {
  console.log("DB:", process.env.DATABASE_URL?.replace(/\/\/[^@]+@/, "//***@"));
  const all = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });
  console.log(`\nTotal warehouses: ${all.length}`);
  for (const w of all) console.log(`  ${w.code.padEnd(15)} status=${w.status}  id=${w.id}  name=${w.name}`);

  const totals = {
    warehouses: await prisma.warehouse.count(),
    receipts: await prisma.receipt.count(),
    deliveries: await prisma.delivery.count(),
    shipments: await prisma.shipment.count(),
    pickLists: await prisma.pickList.count(),
    packLists: await prisma.packList.count(),
    returns: await prisma.returnRMA.count(),
    tasks: await prisma.task.count(),
    items: await prisma.inventoryItem.count(),
    workers: await prisma.workerProfile.count(),
  };
  console.log("\nGlobal totals:");
  console.dir(totals);

  const lacoById = await prisma.warehouse.findUnique({
    where: { id: "69f14070c4bd14bac6c2a6aa" },
    select: { id: true, code: true, status: true },
  });
  console.log("\nLACO-MAIL by id 69f14070c4bd14bac6c2a6aa:", lacoById);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
