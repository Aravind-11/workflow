"use server";

import { ScheduleStatus } from "@prisma/client";
import {
  clockInSchema,
  clockOutSchema,
  setBreakSchema,
} from "../schemas";
import { computeTotalWorkedMinutes } from "../time";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function clockInAction(input: unknown): Promise<ActionResult> {
  const parsed = clockInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const s0 = await prisma.schedule.findUnique({ where: { id: parsed.data.scheduleId } });
  if (!s0) return { ok: false, error: "Schedule not found" };
  const auth = await guardAction(P.workers.manage, s0.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const now = new Date();
  try {
    await prisma.schedule.update({
      where: { id: parsed.data.scheduleId },
      data: {
        actualStart: now,
        status: ScheduleStatus.CLOCKED_IN,
      },
    });
    revalidateWorkers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Clock-in failed" };
  }
}

export async function clockOutAction(input: unknown): Promise<ActionResult> {
  const parsed = clockOutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const s = await prisma.schedule.findUnique({ where: { id: parsed.data.scheduleId } });
  if (!s?.actualStart) {
    return { ok: false, error: "Clock in before clock out" };
  }
  const auth = await guardAction(P.workers.manage, s.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const now = new Date();
  try {
    const total = computeTotalWorkedMinutes(
      s.actualStart,
      now,
      s.breakMinutes ?? 0,
    );
    await prisma.schedule.update({
      where: { id: parsed.data.scheduleId },
      data: {
        actualEnd: now,
        totalWorkedMinutes: total,
        status: ScheduleStatus.CLOCKED_OUT,
      },
    });
    revalidateWorkers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Clock-out failed" };
  }
}

export async function setBreakMinutesAction(input: unknown): Promise<ActionResult> {
  const parsed = setBreakSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  try {
    const s = await prisma.schedule.findUnique({ where: { id: parsed.data.scheduleId } });
    if (!s) return { ok: false, error: "Not found" };
    const auth = await guardAction(P.workers.manage, s.warehouseId);
    if (!auth.ok) return { ok: false, error: auth.error };
    let total: number | null = s.totalWorkedMinutes ?? null;
    if (s.actualStart && s.actualEnd) {
      total = computeTotalWorkedMinutes(
        s.actualStart,
        s.actualEnd,
        parsed.data.breakMinutes,
      );
    }
    await prisma.schedule.update({
      where: { id: parsed.data.scheduleId },
      data: {
        breakMinutes: parsed.data.breakMinutes,
        totalWorkedMinutes: total,
      },
    });
    revalidateWorkers();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
