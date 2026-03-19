"use server";

import { TimeOffStatus } from "@prisma/client";
import {
  timeOffSchema,
  timeOffStatusSchema,
} from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function requestTimeOffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid time off" };
  const { workerProfileId, warehouseId, startAt, endAt, reason } = parsed.data;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (start >= end) {
    return { ok: false, error: "End must be after start" };
  }

  const auth = await guardAction(P.workers.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const worker = await prisma.workerProfile.findFirst({
    where: { id: workerProfileId, warehouseId },
  });
  if (!worker) {
    return { ok: false, error: "Worker not in warehouse" };
  }

  const block = await prisma.timeOffBlock.create({
    data: {
      workerProfileId,
      warehouseId,
      startAt: start,
      endAt: end,
      reason: reason ?? null,
      status: TimeOffStatus.REQUESTED,
    },
  });
  revalidateWorkers();
  return { ok: true, data: { id: block.id } };
}

export async function updateTimeOffStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = timeOffStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const block = await prisma.timeOffBlock.findUnique({ where: { id: parsed.data.id } });
  if (!block) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.workers.manage, block.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  await prisma.timeOffBlock.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });
  revalidateWorkers();
  return { ok: true };
}
