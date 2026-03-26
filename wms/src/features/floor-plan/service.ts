import { prisma } from "@/server/db/prisma";
import type {
  FloorArrow,
  FloorPlanData,
  FloorZone,
  RouteTemplate,
  TaskLogEntry,
  TaskOnMap,
} from "./types";

export async function getFloorPlan(
  warehouseId: string,
): Promise<FloorPlanData | null> {
  const plan = await prisma.floorPlan.findUnique({ where: { warehouseId } });
  if (!plan) return null;
  const raw = plan as Record<string, unknown>;
  return {
    id: plan.id,
    warehouseId: plan.warehouseId,
    imageData: plan.imageData,
    zones: (plan.zones as FloorZone[]) ?? [],
    arrows: (raw.arrows as FloorArrow[]) ?? [],
  };
}

export async function getTasksForMap(
  warehouseId: string,
): Promise<TaskOnMap[]> {
  const tasks = await prisma.task.findMany({
    where: { warehouseId },
    include: {
      workerProfile: { select: { firstName: true, lastName: true } },
      location: { select: { locationCode: true, zone: true } },
      routeTemplate: { select: { zoneSequence: true } },
      logs: {
        where: { action: "TICKET" },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      },
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
    workerProfileId: t.workerProfileId,
    zoneName: t.zoneId ?? t.location?.zone ?? null,
    locationCode: t.location?.locationCode ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    routeTemplateId: t.routeTemplateId,
    expectedRoute: t.routeTemplate
      ? (t.routeTemplate.zoneSequence as string[])
      : null,
    hasTicket: t.logs.length > 0,
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

export async function getRouteTemplates(
  warehouseId: string,
): Promise<RouteTemplate[]> {
  const templates = await prisma.routeTemplate.findMany({
    where: { warehouseId },
    orderBy: { name: "asc" },
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    zoneSequence: t.zoneSequence as string[],
  }));
}
