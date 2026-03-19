"use server";

import { swapSchedulesSchema } from "../schemas";
import {
  findApprovedTimeOffConflicts,
  findConflictingSchedules,
} from "../service";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function swapSchedulesAction(input: unknown): Promise<ActionResult> {
  const parsed = swapSchedulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid swap" };
  const { scheduleIdA, scheduleIdB } = parsed.data;

  try {
    const [a, b] = await Promise.all([
      prisma.schedule.findUnique({
        where: { id: scheduleIdA },
        include: { shift: true },
      }),
      prisma.schedule.findUnique({
        where: { id: scheduleIdB },
        include: { shift: true },
      }),
    ]);
    if (!a || !b) return { ok: false, error: "Schedules not found" };
    if (a.warehouseId !== b.warehouseId) {
      return { ok: false, error: "Swap only within the same warehouse" };
    }
    const auth = await guardAction(P.workers.manage, a.warehouseId);
    if (!auth.ok) return { ok: false, error: auth.error };
    if (a.id === b.id) return { ok: false, error: "Choose two different schedules" };

    const aWorker = a.workerProfileId;
    const bWorker = b.workerProfileId;

    if (!a.plannedStart || !a.plannedEnd || !b.plannedStart || !b.plannedEnd) {
      return { ok: false, error: "Both schedules need planned times" };
    }

    const moveAtoB = await findConflictingSchedules(
      aWorker,
      b.plannedStart,
      b.plannedEnd,
      [a.id, b.id],
    );
    const moveBtoA = await findConflictingSchedules(
      bWorker,
      a.plannedStart,
      a.plannedEnd,
      [a.id, b.id],
    );

    if (moveAtoB.length) {
      return {
        ok: false,
        error: `Swap blocked: overlaps ${moveAtoB[0].shift.name}`,
      };
    }
    if (moveBtoA.length) {
      return {
        ok: false,
        error: `Swap blocked: overlaps ${moveBtoA[0].shift.name}`,
      };
    }

    const toA = await findApprovedTimeOffConflicts(aWorker, b.plannedStart, b.plannedEnd);
    const toB = await findApprovedTimeOffConflicts(bWorker, a.plannedStart, a.plannedEnd);
    if (toA.length || toB.length) {
      return { ok: false, error: "Swap conflicts with approved time off" };
    }

    await prisma.$transaction([
      prisma.schedule.update({
        where: { id: a.id },
        data: { workerProfileId: bWorker },
      }),
      prisma.schedule.update({
        where: { id: b.id },
        data: { workerProfileId: aWorker },
      }),
    ]);

    revalidateWorkers();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Swap failed" };
  }
}
