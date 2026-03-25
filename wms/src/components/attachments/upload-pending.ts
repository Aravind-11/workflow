import { uploadAttachment } from "@/features/attachments/actions";
import type { PendingImage } from "./pending-image-picker";

export async function uploadPendingImages(
  entityType: string,
  entityId: string,
  images: PendingImage[],
) {
  for (const img of images) {
    await uploadAttachment({
      entityType,
      entityId,
      fileName: img.fileName,
      mimeType: img.mimeType,
      data: img.base64,
    });
  }
}
