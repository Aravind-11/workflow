import { prisma } from "@/server/db/prisma";

export type AttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  data: string;
  uploaderName: string;
  createdAt: string;
};

export async function getAttachments(
  entityType: string,
  entityId: string,
): Promise<AttachmentRow[]> {
  const rows = await prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true, nickname: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    data: r.data,
    uploaderName: r.user.nickname ?? r.user.fullName,
    createdAt: r.createdAt.toISOString(),
  }));
}
