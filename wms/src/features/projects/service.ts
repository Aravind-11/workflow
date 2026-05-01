import { prisma } from "@/server/db/prisma";

export async function listProjects(warehouseId?: string) {
  return prisma.project.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    include: {
      // `id` is included so the directory can deep-link straight into the
      // warehouse-scoped Workflow Designer for each project row.
      warehouse: { select: { id: true, code: true, name: true } },
      _count: { select: { workflows: true, trackingItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      warehouse: { select: { code: true, name: true } },
      workflows: {
        select: { id: true, name: true, isActive: true, version: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { trackingItems: true } },
    },
  });
}
