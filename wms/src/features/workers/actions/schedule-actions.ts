"use server";

import {
  ScheduleConfirmation,
  ScheduleStatus,
} from "@prisma/client";
import {
  assignSchedulesSchema,
  updateScheduleSchema,
} from "../schemas";
import {
  findApprovedTimeOffConflicts,
  findConflictingSchedules,
} from "../service";
import { plannedWindowFromShift } from "../time";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function assignSchedulesAction(
  input: unknown,
): Promise<ActionResult<{ created: number; warnings?: string[] }>> {
  const parsed = assignSchedulesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid assignment payload" };
  }
  const {
    warehouseId,
    shiftId,
    scheduleDate: scheduleDateRaw,
    workerIds,
    locationId,
    confirmationStatus,
  } = parsed.data;

  const auth = await guardAction(P.workers.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, warehouseId },
  });
  if (!shift) {
    return { ok: false, error: "Shift not found for this warehouse" };
  }

  if (locationId) {
    const loc = await prisma.warehouseLocationHierarchy.findFirst({
      where: { id: locationId, warehouseId },
    });
    if (!loc) {
      return { ok: false, error: "Location must belong to the selected warehouse" };
    }
  }

  const [yr, mo, dy] = scheduleDateRaw.split("-").map(Number);
  const day = new Date(Date.UTC(yr, mo - 1, dy));
  const { plannedStart, plannedEnd } = plannedWindowFromShift(
    day,
    shift.startTime,
    shift.endTime,
    shift.isOvernight,
  );

  const uniqueWorkers = Array.from(new Set(workerIds));
  const errors: string[] = [];
  const eligible: string[] = [];

  for (const workerProfileId of uniqueWorkers) {
    const w = await prisma.workerProfile.findFirst({
      where: { id: workerProfileId, warehouseId },
    });
    if (!w) {
      errors.push(`Worker ${workerProfileId} is not in this warehouse`);
      continue;
    }

    const conflicts = await findConflictingSchedules(
      workerProfileId,
      plannedStart,
      plannedEnd,
    );
    if (conflicts.length) {
      errors.push(
        `${w.firstName} ${w.lastName}: overlaps ${conflicts.map((c) => c.shift.name).join(", ")}`,
      );
      continue;
    }

    const toBlocks = await findApprovedTimeOffConflicts(
      workerProfileId,
      plannedStart,
      plannedEnd,
    );
    if (toBlocks.length) {
      errors.push(
        `${w.firstName} ${w.lastName}: time off ${toBlocks[0].startAt.toISOString().slice(0, 10)}`,
      );
      continue;
    }

    eligible.push(workerProfileId);
  }

  if (eligible.length === 0) {
    return {
      ok: false,
      error: errors.length ? errors.join(" · ") : "No workers to assign",
    };
  }

  let created = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const workerProfileId of eligible) {
        await tx.schedule.upsert({
          where: {
            workerProfileId_scheduleDate_shiftId: {
              workerProfileId,
              scheduleDate: day,
              shiftId,
            },
          },
          create: {
            warehouseId,
            workerProfileId,
            shiftId,
            scheduleDate: day,
            locationId: locationId ?? null,
            status:
              confirmationStatus === ScheduleConfirmation.CONFIRMED
                ? ScheduleStatus.ASSIGNED
                : ScheduleStatus.PLANNED,
            confirmationStatus,
            plannedStart,
            plannedEnd,
          },
          update: {
            locationId: locationId ?? null,
            confirmationStatus,
            plannedStart,
            plannedEnd,
            status:
              confirmationStatus === ScheduleConfirmation.CONFIRMED
                ? ScheduleStatus.ASSIGNED
                : ScheduleStatus.PLANNED,
          },
        });
        created += 1;
      }
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Assignment failed" };
  }

  revalidateWorkers();
  return {
    ok: true,
    data: {
      created,
      warnings: errors.length ? errors : undefined,
    },
  };
}

export async function updateScheduleAction(input: unknown): Promise<ActionResult> {
  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid update" };
  }
  const { id, ...rest } = parsed.data;

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Schedule not found" };
  const auth = await guardAction(P.workers.manage, existing.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const plannedStart =
    rest.plannedStart && String(rest.plannedStart).trim()
      ? new Date(rest.plannedStart)
      : existing.plannedStart;
  const plannedEnd =
    rest.plannedEnd && String(rest.plannedEnd).trim()
      ? new Date(rest.plannedEnd)
      : existing.plannedEnd;

  if (plannedStart && plannedEnd) {
    const conflicts = await findConflictingSchedules(
      existing.workerProfileId,
      plannedStart,
      plannedEnd,
      [id],
    );
    if (conflicts.length) {
      return {
        ok: false,
        error: `Overlaps another shift (${conflicts[0].shift.name})`,
      };
    }
    const toBlocks = await findApprovedTimeOffConflicts(
      existing.workerProfileId,
      plannedStart,
      plannedEnd,
    );
    if (toBlocks.length) {
      return { ok: false, error: "Overlaps approved time off" };
    }
  }

  try {
    await prisma.schedule.update({
      where: { id },
      data: {
        locationId: rest.locationId === undefined ? undefined : rest.locationId,
        confirmationStatus: rest.confirmationStatus,
        plannedStart: rest.plannedStart === undefined ? undefined : plannedStart,
        plannedEnd: rest.plannedEnd === undefined ? undefined : plannedEnd,
        status: rest.status,
        breakMinutes: rest.breakMinutes,
      },
    });
    revalidateWorkers();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}
