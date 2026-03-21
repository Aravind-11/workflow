"use server";

import { createClient } from "@/lib/supabase/server";
import { createDocumentRecord, deleteDocumentRecord } from "./service";

const BUCKET = "wms-documents";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function uploadDocumentAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string;
  const entityId = formData.get("entityId") as string;

  if (!file || !entityType || !entityId) {
    return { ok: false as const, error: "Missing required fields" };
  }

  if (file.size > MAX_SIZE) {
    return { ok: false as const, error: "File exceeds 10 MB limit" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false as const, error: "File type not allowed" };
  }

  const supabase = await createClient();
  const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false as const, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const doc = await createDocumentRecord({
    entityType,
    entityId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    publicUrl: urlData.publicUrl,
  });

  return { ok: true as const, document: JSON.parse(JSON.stringify(doc)) };
}

export async function deleteDocumentAction(id: string, storagePath: string) {
  const supabase = await createClient();

  await supabase.storage.from(BUCKET).remove([storagePath]);
  await deleteDocumentRecord(id);

  return { ok: true as const };
}
