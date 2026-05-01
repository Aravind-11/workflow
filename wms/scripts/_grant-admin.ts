/**
 * Grant admin role on LACO-MAIL warehouse to whoever the most-recent caller is,
 * or a specific email passed via argv. Pass --list to just print roles for everyone.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local") });
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const list = args.includes("--list");
  const targetEmail = args.find((a) => a.includes("@"));
  const targetUserId = args.find((a) => /^[a-f0-9]{24}$/.test(a));

  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true },
    orderBy: { createdAt: "desc" },
  });
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const adminRole = roles.find((r) => r.name === "admin");
  const userRoles = await prisma.userRole.findMany({
    select: { userId: true, roleId: true, warehouseId: true },
  });

  const roleById = new Map(roles.map((r) => [r.id, r.name]));
  const wh = await prisma.warehouse.findMany({ select: { id: true, code: true } });
  const whById = new Map(wh.map((w) => [w.id, w.code]));

  console.log("Users and their roles:");
  for (const u of users) {
    const ur = userRoles.filter((x) => x.userId === u.id);
    const summary = ur.length === 0
      ? "(none)"
      : ur.map((x) => `${roleById.get(x.roleId) ?? "?"}@${whById.get(x.warehouseId) ?? "?"}`).join(", ");
    console.log(`  ${u.id}  ${u.email}  →  ${summary}`);
  }

  if (list) return;

  const target = targetUserId
    ? users.find((u) => u.id === targetUserId)
    : targetEmail
      ? users.find((u) => u.email === targetEmail)
      : users[0];
  if (!target) throw new Error("No target user found");
  if (!adminRole) throw new Error("admin role not found");

  const lacoMail = wh.find((w) => w.code === "LACO-MAIL");
  if (!lacoMail) throw new Error("LACO-MAIL warehouse missing");

  const existing = userRoles.find(
    (x) => x.userId === target.id && x.roleId === adminRole.id && x.warehouseId === lacoMail.id,
  );
  if (existing) {
    console.log(`\n${target.email} already has admin@LACO-MAIL.`);
  } else {
    await prisma.userRole.create({
      data: { userId: target.id, roleId: adminRole.id, warehouseId: lacoMail.id },
    });
    console.log(`\nGranted admin@LACO-MAIL to ${target.email} (${target.id}).`);
  }

  for (const w of wh) {
    if (w.id === lacoMail.id) continue;
    const has = userRoles.find(
      (x) => x.userId === target.id && x.roleId === adminRole.id && x.warehouseId === w.id,
    );
    if (!has) {
      await prisma.userRole.create({
        data: { userId: target.id, roleId: adminRole.id, warehouseId: w.id },
      });
      console.log(`  + admin@${w.code}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
