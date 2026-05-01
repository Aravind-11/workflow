import { prisma } from "@/server/db/prisma";

export async function getThroughputByStage(
  warehouseId: string,
  days = 30,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.trackingEvent.findMany({
    where: {
      trackingItem: { warehouseId },
      timestamp: { gte: since },
    },
    select: {
      stageType: true,
      timestamp: true,
    },
    orderBy: { timestamp: "asc" },
  });

  const grouped: Record<string, Record<string, number>> = {};
  for (const e of events) {
    const dateKey = e.timestamp.toISOString().slice(0, 10);
    grouped[dateKey] ??= {};
    grouped[dateKey][e.stageType] = (grouped[dateKey][e.stageType] ?? 0) + 1;
  }

  return Object.entries(grouped)
    .map(([date, stages]) => ({ date, ...stages }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDwellTimeByStage(warehouseId: string) {
  const items = await prisma.trackingItem.findMany({
    where: { warehouseId },
    include: {
      events: { orderBy: { timestamp: "asc" } },
    },
    take: 500,
  });

  const stageDwell: Record<string, number[]> = {};

  for (const item of items) {
    for (let i = 0; i < item.events.length - 1; i++) {
      const current = item.events[i];
      const next = item.events[i + 1];
      const durationMs = next.timestamp.getTime() - current.timestamp.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      stageDwell[current.stageType] ??= [];
      stageDwell[current.stageType].push(durationHours);
    }
  }

  return Object.entries(stageDwell).map(([stage, durations]) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    return { stage, avgHours: Math.round(avg * 100) / 100, maxHours: Math.round(max * 100) / 100, count: durations.length };
  });
}

export async function getTaskCompletionStats(warehouseId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [total, completed, open] = await Promise.all([
    prisma.task.count({ where: { warehouseId, createdAt: { gte: since } } }),
    prisma.task.count({ where: { warehouseId, status: "COMPLETED", createdAt: { gte: since } } }),
    prisma.task.count({ where: { warehouseId, status: "OPEN", createdAt: { gte: since } } }),
  ]);

  return { total, completed, open, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export async function getWorkerProductivity(warehouseId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.trackingEvent.findMany({
    where: {
      trackingItem: { warehouseId },
      timestamp: { gte: since },
      handledBy: { not: null },
    },
    select: { handledBy: true },
  });

  const counts: Record<string, number> = {};
  for (const e of events) {
    if (e.handledBy) {
      counts[e.handledBy] = (counts[e.handledBy] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([worker, eventCount]) => ({ worker, eventCount }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 20);
}
