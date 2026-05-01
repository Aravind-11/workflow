/**
 * Repair LACO-MAIL WorkerProfile names.
 *
 * Bug: the original loader's name parser fell apart for operators whose
 * alias set was iterated in lowercase-first order — it ended up writing
 * `firstName: "bdennis1"` and `lastName: "bdennis1"`, which renders as
 * "bdennis1 bdennis1" everywhere (sidebar, schedules, audit log).
 *
 * This script re-derives a clean "<initial>. <Surname>" pair from each
 * worker's `certifications` list (which holds the original aliases) and
 * the `employeeCode` (the canonical username, e.g. "bdennis"). Idempotent
 * — running it on already-clean rows is a no-op.
 *
 * Run:
 *   npx tsx scripts/fix-laco-operator-names.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../.env.local") });
const prisma = new PrismaClient();

const WAREHOUSE_CODE = "LACO-MAIL";

function parseOperatorName(
  canon: string,
  aliases: string[],
): { firstName: string; lastName: string } {
  const camelRe = /^([A-Z])([A-Z][a-z]+)$/;
  const camel = aliases.find((a) => camelRe.test(a));
  if (camel) {
    const m = camel.match(camelRe);
    if (m) return { firstName: `${m[1]}.`, lastName: m[2] };
  }
  if (canon.length >= 2) {
    const initial = canon[0]!.toUpperCase();
    const surname = canon[1]!.toUpperCase() + canon.slice(2).toLowerCase();
    return { firstName: `${initial}.`, lastName: surname };
  }
  const cap = canon.charAt(0).toUpperCase() + canon.slice(1);
  return { firstName: cap, lastName: cap };
}

async function main() {
  const wh = await prisma.warehouse.findUnique({
    where: { code: WAREHOUSE_CODE },
    select: { id: true, name: true },
  });
  if (!wh) throw new Error(`Warehouse ${WAREHOUSE_CODE} not found`);
  console.log(`▸ ${wh.name} (${wh.id})`);

  const workers = await prisma.workerProfile.findMany({
    where: { warehouseId: wh.id },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      certifications: true,
    },
  });
  console.log(`  workers: ${workers.length}`);

  let fixed = 0;
  let unchanged = 0;
  for (const w of workers) {
    const aliases = (w.certifications ?? []) as string[];
    const { firstName, lastName } = parseOperatorName(w.employeeCode, aliases);
    if (w.firstName === firstName && w.lastName === lastName) {
      unchanged++;
      continue;
    }
    await prisma.workerProfile.update({
      where: { id: w.id },
      data: { firstName, lastName },
    });
    console.log(
      `  ✓ ${w.employeeCode}: "${w.firstName} ${w.lastName}" → "${firstName} ${lastName}"`,
    );
    fixed++;
  }

  console.log(`\nDone — fixed: ${fixed}, unchanged: ${unchanged}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
