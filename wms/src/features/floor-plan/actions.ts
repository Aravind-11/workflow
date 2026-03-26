"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/server/db/prisma";
import type { ActionResult } from "@/lib/types";

const zoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string(),
});

const saveFloorPlanSchema = z.object({
  warehouseId: z.string().min(1),
  imageData: z.string().nullable(),
  zones: z.array(zoneSchema),
});

export async function saveFloorPlanAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = saveFloorPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid floor plan data" };

  const { warehouseId, imageData, zones } = parsed.data;
  const auth = await guardAction(P.tasks.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const plan = await prisma.floorPlan.upsert({
    where: { warehouseId },
    create: { warehouseId, imageData, zones },
    update: { imageData, zones, updatedAt: new Date() },
  });

  revalidatePath("/tasks");
  return { ok: true, data: { id: plan.id } };
}

const updateTaskZoneSchema = z.object({
  taskId: z.string().min(1),
  zoneName: z.string().nullable(),
});

export async function updateTaskZoneAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateTaskZoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { taskId, zoneName } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const auth = await guardAction(P.tasks.manage, task.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const ctx = await requireAuth();

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: { zoneId: zoneName },
    }),
    prisma.taskLog.create({
      data: {
        taskId,
        userId: ctx.userId,
        action: "ZONE_CHANGE",
        message: zoneName
          ? `Task moved to zone "${zoneName}"`
          : "Task removed from zone",
        zoneName,
      },
    }),
  ]);

  revalidatePath("/tasks");
  return { ok: true };
}

const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export async function updateTaskStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { taskId, status } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const auth = await guardAction(P.tasks.manage, task.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const ctx = await requireAuth();

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: status as never,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    }),
    prisma.taskLog.create({
      data: {
        taskId,
        userId: ctx.userId,
        action: "STATUS_CHANGE",
        message: `Status changed to ${status.replace(/_/g, " ")}`,
      },
    }),
  ]);

  revalidatePath("/tasks");
  return { ok: true };
}

const addTaskLogSchema = z.object({
  taskId: z.string().min(1),
  message: z.string().min(1).max(1000),
});

export async function addTaskLogAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = addTaskLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { taskId, message } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const auth = await guardAction(P.tasks.manage, task.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const ctx = await requireAuth();

  await prisma.taskLog.create({
    data: {
      taskId,
      userId: ctx.userId,
      action: "NOTE",
      message,
    },
  });

  revalidatePath("/tasks");
  return { ok: true };
}

const raiseTicketSchema = z.object({
  taskId: z.string().min(1),
  reason: z.enum(["BLOCKED", "NEEDS_HUMAN", "NEEDS_TELEOPS", "OTHER"]),
  details: z.string().max(1000).optional(),
});

export async function raiseTicketAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = raiseTicketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid ticket" };

  const { taskId, reason, details } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const auth = await guardAction(P.tasks.manage, task.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const ctx = await requireAuth();

  const label = reason.replace(/_/g, " ").toLowerCase();
  const msg = details
    ? `Ticket raised: ${label} — ${details}`
    : `Ticket raised: ${label}`;

  await prisma.taskLog.create({
    data: {
      taskId,
      userId: ctx.userId,
      action: "TICKET",
      message: msg,
    },
  });

  revalidatePath("/tasks");
  return { ok: true };
}

const assignTaskSchema = z.object({
  taskId: z.string().min(1),
  assigneeType: z.enum(["HUMAN", "ROBOT"]).nullable(),
  workerProfileId: z.string().nullable(),
});

export async function assignTaskAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { taskId, assigneeType, workerProfileId } = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const auth = await guardAction(P.tasks.manage, task.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const ctx = await requireAuth();

  let assigneeName = "Unassigned";
  if (assigneeType === "ROBOT") {
    assigneeName = "Robot";
  } else if (workerProfileId) {
    const w = await prisma.workerProfile.findUnique({
      where: { id: workerProfileId },
      select: { firstName: true, lastName: true },
    });
    assigneeName = w ? `${w.firstName} ${w.lastName}` : "Unknown worker";
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeType,
        workerProfileId: assigneeType === "HUMAN" ? workerProfileId : null,
      },
    }),
    prisma.taskLog.create({
      data: {
        taskId,
        userId: ctx.userId,
        action: "ASSIGNMENT",
        message: assigneeType
          ? `Assigned to ${assigneeType.toLowerCase()}: ${assigneeName}`
          : "Task unassigned",
      },
    }),
  ]);

  revalidatePath("/tasks");
  return { ok: true };
}
