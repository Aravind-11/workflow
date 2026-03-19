"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus, TaskType } from "@prisma/client";
import { z } from "zod";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import { prisma } from "@/server/db/prisma";

const schema = z.object({
  warehouseId: z.string().min(1),
  title: z.string().min(1).max(500),
  taskType: z.nativeEnum(TaskType),
  priority: z.coerce.number().int().min(1).max(5).optional().default(3),
  dueDate: z.string().optional().nullable(),
});

export async function createTaskAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid task" };
  const d = parsed.data;
  const due = d.dueDate?.trim() ? new Date(d.dueDate) : null;
  if (due && Number.isNaN(due.getTime())) {
    return { ok: false as const, error: "Invalid due date" };
  }
  const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId } });
  if (!wh) return { ok: false as const, error: "Warehouse not found" };
  const auth = await guardAction(P.tasks.manage, d.warehouseId);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  await prisma.task.create({
    data: {
      warehouseId: d.warehouseId,
      title: d.title,
      taskType: d.taskType,
      priority: d.priority,
      dueDate: due,
      status: TaskStatus.OPEN,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true as const };
}
