import { prisma } from "@/server/db/prisma";

export async function listQueueUploads() {
  return prisma.queueUpload.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      stages: true,
      uploadedAt: true,
      _count: { select: { entries: true } },
    },
  });
}

export async function getLatestUpload() {
  return prisma.queueUpload.findFirst({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      stages: true,
      uploadedAt: true,
      _count: { select: { entries: true } },
    },
  });
}

export async function getEntriesByStage(uploadId: string, stage: string) {
  return prisma.queueEntry.findMany({
    where: { uploadId, queue: stage },
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      pallet: true,
      boxName: true,
      batch: true,
      queue: true,
      operator: true,
      timestamp: true,
      barcode: true,
    },
  });
}

export async function getAllEntriesForUpload(uploadId: string) {
  return prisma.queueEntry.findMany({
    where: { uploadId },
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      pallet: true,
      boxName: true,
      batch: true,
      queue: true,
      operator: true,
      timestamp: true,
      barcode: true,
    },
  });
}

export async function getStageStats(uploadId: string) {
  const groups = await prisma.queueEntry.groupBy({
    by: ["queue"],
    where: { uploadId },
    _count: { id: true },
  });
  return groups.reduce<Record<string, number>>((acc, g) => {
    acc[g.queue] = g._count.id;
    return acc;
  }, {});
}
