"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireAuth } from "@/lib/auth/session";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_LENGTH = 2_000_000; // ~1.5 MB decoded

const UploadSchema = z.object({
  entityType: z.enum(["Receipt", "PickList", "PackList", "Shipment", "Return"]),
  entityId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().refine((v) => ALLOWED_TYPES.includes(v), "Unsupported image type"),
  data: z
    .string()
    .min(1)
    .max(MAX_BASE64_LENGTH, "Image too large — please use a smaller photo"),
});

export type AttachmentResult = { ok: true; id: string } | { ok: false; error: string };

export async function uploadAttachment(input: {
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  data: string;
}): Promise<AttachmentResult> {
  const ctx = await requireAuth();

  const parsed = UploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const attachment = await prisma.attachment.create({
    data: {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      data: parsed.data.data,
      uploadedBy: ctx.userId,
    },
  });

  revalidatePath("/");
  return { ok: true, id: attachment.id };
}

export async function deleteAttachment(
  attachmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAuth();

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    return { ok: false, error: "Attachment not found" };
  }

  if (attachment.uploadedBy !== ctx.userId && !ctx.permissions.has("admin.users")) {
    return { ok: false, error: "You can only delete your own attachments" };
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });

  revalidatePath("/");
  return { ok: true };
}

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
