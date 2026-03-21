"use server";

import { prisma } from "@/server/db/prisma";

export async function getDocuments(entityType: string, entityId: string) {
  return prisma.document.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocumentRecord(data: {
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  uploadedBy?: string;
}) {
  return prisma.document.create({ data });
}

export async function deleteDocumentRecord(id: string) {
  return prisma.document.delete({ where: { id } });
}
