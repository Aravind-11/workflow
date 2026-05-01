import { prisma } from "@/server/db/prisma";

type ProjectSelect = { id: string; code: string; name: string };

// The WarehouseProject Prisma model is intentionally not in schema.prisma yet
// (legacy DBs may or may not have the underlying collection). We access it via
// a typed shim so callers degrade to no-ops when the model is absent at
// runtime. Once the model is added to the schema, switch back to direct
// `prisma.warehouseProject` access.
type WarehouseProjectDelegate = {
  findMany: (a: unknown) => Promise<ProjectSelect[]>;
  findUnique: (a: unknown) => Promise<{ id: string; warehouseId: string } | null>;
  findFirst: (a: unknown) => Promise<{ id: string } | null>;
  create: (a: unknown) => Promise<{ id: string }>;
};

function delegate(): WarehouseProjectDelegate | undefined {
  return (prisma as unknown as { warehouseProject?: WarehouseProjectDelegate }).warehouseProject;
}

/**
 * Lists projects for a warehouse. If none exist (legacy DB / pre–WarehouseProject schema),
 * creates a default **MAIN** project so workflows and the designer work without manual Mongo edits.
 */
export async function listWarehouseProjects(warehouseId: string): Promise<ProjectSelect[]> {
  const wp = delegate();
  if (!wp?.findMany) {
    return [];
  }

  try {
    const existing = await wp.findMany({
      where: { warehouseId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });
    if (existing.length > 0) return existing;

    try {
      await wp.create({
        data: {
          warehouseId,
          code: "MAIN",
          name: "Main operations",
        },
      });
    } catch {
      // Race or unique [warehouseId, code] — refetch below
    }

    return await wp.findMany({
      where: { warehouseId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });
  } catch {
    return [];
  }
}

export async function getWarehouseProjectScoped(
  projectId: string,
  warehouseId: string,
): Promise<{ id: string } | null> {
  const wp = delegate();
  if (!wp?.findFirst) return null;
  return wp.findFirst({
    where: { id: projectId, warehouseId },
    select: { id: true },
  });
}

export async function getWarehouseProjectById(
  projectId: string,
): Promise<{ id: string; warehouseId: string } | null> {
  const wp = delegate();
  if (!wp?.findUnique) return null;
  return wp.findUnique({
    where: { id: projectId },
    select: { id: true, warehouseId: true },
  });
}
