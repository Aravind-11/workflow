import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export async function writeAuditLog(
  data: {
    userId?: string | null;
    warehouseId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
  },
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId: data.userId ?? undefined,
      warehouseId: data.warehouseId ?? undefined,
      entityType: data.entityType,
      entityId: data.entityId ?? undefined,
      action: data.action,
      oldValues: data.oldValues,
      newValues: data.newValues,
    },
  });
}
