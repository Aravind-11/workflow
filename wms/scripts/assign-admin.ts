import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const dir = new URL(".", import.meta.url).pathname;
config({ path: resolve(dir, "../.env") });
config({ path: resolve(dir, "../.env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log("Users:", users.map((u) => u.email));

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) {
    console.log("No admin role found — run prisma:seed first");
    return;
  }

  const warehouses = await prisma.warehouse.findMany({ select: { id: true } });
  console.log("Warehouses:", warehouses.length);

  for (const user of users) {
    const count = await prisma.userRole.count({ where: { userId: user.id } });
    if (count > 0) {
      console.log(user.email, "already has", count, "role(s), skipping");
      continue;
    }
    await prisma.userRole.createMany({
      data: warehouses.map((w) => ({ userId: user.id, roleId: adminRole.id, warehouseId: w.id })),
    });
    console.log("Assigned admin to", user.email, "for", warehouses.length, "warehouse(s)");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
