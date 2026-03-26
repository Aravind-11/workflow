import { TaskStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { FloorPlanData, FloorZone, TaskLogEntry, TaskOnMap } from "./types";

export async function getFloorPlan(
  warehouseId: string,
): Promise<FloorPlanData | null> {
  const plan = await prisma.floorPlan.findUnique({ where: { warehouseId } });
  if (!plan) return null;
  return {
    id: plan.id,
    warehouseId: plan.warehouseId,
    imageData: plan.imageData,
    zones: (plan.zones as FloorZone[]) ?? [],
  };
}

export async function getTasksForMap(
  warehouseId: string,
): Promise<TaskOnMap[]> {
  const tasks = await prisma.task.findMany({
    where: {
      warehouseId,
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    include: {
      workerProfile: { select: { firstName: true, lastName: true } },
      location: { select: { locationCode: true, zone: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    taskType: t.taskType,
    status: t.status,
    priority: t.priority,
    assigneeType: t.assigneeType,
    assigneeName: t.workerProfile
      ? `${t.workerProfile.firstName} ${t.workerProfile.lastName}`
      : null,
    zoneName: t.zoneId ?? t.location?.zone ?? null,
    locationCode: t.location?.locationCode ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function getTaskLogs(taskId: string): Promise<TaskLogEntry[]> {
  const logs = await prisma.taskLog.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    message: l.message,
    zoneName: l.zoneName,
    createdAt: l.createdAt.toISOString(),
  }));
}
