"use server";

import { DockAppointmentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { dockAppointmentSchema, dockCheckInSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages } from "./shared";

export async function createDockAppointmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = dockAppointmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid appointment" };
  const d = parsed.data;
  const auth = await guardAction(P.deliveries.manage, d.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const appt = await prisma.dockAppointment.create({
    data: {
      warehouseId: d.warehouseId,
      appointmentCode: d.appointmentCode,
      carrier: d.carrier,
      dockDoor: d.dockDoor,
      scheduledStart: new Date(d.scheduledStart),
      scheduledEnd: new Date(d.scheduledEnd),
      status: DockAppointmentStatus.SCHEDULED,
    },
  });
  revalidateLogisticsPages();
  return { ok: true, data: { id: appt.id } };
}

export async function dockCheckInAction(input: unknown): Promise<ActionResult> {
  const parsed = dockCheckInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  const appt = await prisma.dockAppointment.findUnique({ where: { id: parsed.data.id } });
  if (!appt) return { ok: false, error: "Not found" };
  const auth = await guardAction(P.deliveries.manage, appt.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const now = new Date();
  await prisma.dockAppointment.update({
    where: { id: parsed.data.id },
    data: {
      status: DockAppointmentStatus.CHECKED_IN,
      checkedInAt: now,
    },
  });
  revalidateLogisticsPages();
  return { ok: true };
}
