/**
 * Merge phantom-duplicate WorkerProfiles in LACO-MAIL.
 *
 * Background: the original loader's canonical() function lowercases and
 * strips whitespace but doesn't strip trailing digits, so "BDennis" and
 * "bdennis1" — same person, different alias — got created as two separate
 * WorkerProfile rows ("bdennis" and "bdennis1"). This shows up everywhere:
 * 6 operators on the dashboard instead of 5, two "B. Dennis" rows on the
 * schedules grid, etc.
 *
 * This script finds every worker whose employeeCode looks like another
 * worker's code with a trailing digit suffix (e.g. "bdennis1" → "bdennis"),
 * folds all references into the survivor, and deletes the duplicate.
 *
 * Idempotent — running on already-merged data is a no-op.
 *
 * Run:
 *   npx tsx scripts/merge-laco-duplicate-workers.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../.env.local") });
const prisma = new PrismaClient();

async function main() {
  const wh = await prisma.warehouse.findUnique({
    where: { code: "LACO-MAIL" },
    select: { id: true, name: true },
  });
  if (!wh) throw new Error("LACO-MAIL not found");
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

  // Build a lookup so we can detect a duplicate when its employeeCode is
  // another worker's code + a trailing digit run (e.g. "bdennis1" matches
  // "bdennis"). The canonical survivor is the row WITHOUT the digit suffix.
  const byCode = new Map(workers.map((w) => [w.employeeCode, w]));
  type Pair = { dup: typeof workers[number]; survivor: typeof workers[number] };
  const merges: Pair[] = [];
  for (const w of workers) {
    const m = w.employeeCode.match(/^([a-z]+)(\d+)$/);
    if (!m) continue;
    const candidate = byCode.get(m[1]!);
    if (!candidate || candidate.id === w.id) continue;
    merges.push({ dup: w, survivor: candidate });
  }

  if (merges.length === 0) {
    console.log("  No duplicate workers detected — nothing to do.");
    await prisma.$disconnect();
    return;
  }

  for (const { dup, survivor } of merges) {
    console.log(
      `\n▸ Merging "${dup.employeeCode}" → "${survivor.employeeCode}"`,
    );

    // 1. Tasks (workerProfileId nullable, no unique constraints) — bulk reassign.
    const taskUpd = await prisma.task.updateMany({
      where: { workerProfileId: dup.id },
      data: { workerProfileId: survivor.id },
    });
    console.log(`  · tasks reassigned: ${taskUpd.count}`);

    // 2. Schedules — unique on (workerProfileId, scheduleDate, shiftId).
    //    Move what we can, drop conflicts (same person can't be scheduled twice
    //    on the same shift+date — survivor wins, dup row is redundant).
    const dupSchedules = await prisma.schedule.findMany({
      where: { workerProfileId: dup.id },
      select: { id: true, scheduleDate: true, shiftId: true },
    });
    let schedMoved = 0;
    let schedDropped = 0;
    for (const s of dupSchedules) {
      const conflict = await prisma.schedule.findFirst({
        where: {
          workerProfileId: survivor.id,
          scheduleDate: s.scheduleDate,
          shiftId: s.shiftId,
        },
        select: { id: true },
      });
      if (conflict) {
        await prisma.schedule.delete({ where: { id: s.id } });
        schedDropped++;
      } else {
        await prisma.schedule.update({
          where: { id: s.id },
          data: { workerProfileId: survivor.id },
        });
        schedMoved++;
      }
    }
    console.log(
      `  · schedules: moved=${schedMoved} dropped-as-dup=${schedDropped}`,
    );

    // 3. TimeOffBlocks — no unique constraints, bulk reassign.
    const timeOffUpd = await prisma.timeOffBlock.updateMany({
      where: { workerProfileId: dup.id },
      data: { workerProfileId: survivor.id },
    });
    console.log(`  · time-off blocks reassigned: ${timeOffUpd.count}`);

    // 4. TrackingEvents — bulk reassign.
    const trackingUpd = await prisma.trackingEvent.updateMany({
      where: { workerProfileId: dup.id },
      data: { workerProfileId: survivor.id },
    });
    console.log(`  · tracking events reassigned: ${trackingUpd.count}`);

    // 5. Fold dup's certifications/aliases into the survivor's set.
    const survivorAliases = new Set([
      ...(survivor.certifications ?? []),
      ...(dup.certifications ?? []),
    ]);
    await prisma.workerProfile.update({
      where: { id: survivor.id },
      data: { certifications: [...survivorAliases] },
    });
    console.log(`  · aliases now: ${[...survivorAliases].join(", ")}`);

    // 6. Delete the duplicate.
    await prisma.workerProfile.delete({ where: { id: dup.id } });
    console.log(`  ✓ deleted duplicate "${dup.employeeCode}"`);
  }

  console.log(`\nDone — merged ${merges.length} duplicate(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
