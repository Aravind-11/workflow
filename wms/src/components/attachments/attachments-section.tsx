import { ImageUploader } from "./image-uploader";
import { AttachmentGallery } from "./attachment-gallery";
import { getAttachments } from "@/features/attachments/service";

export async function AttachmentsSection({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const items = await getAttachments(entityType, entityId);

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-border dark:bg-navy-surface sm:p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Attachments
        {items.length > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
            {items.length}
          </span>
        )}
      </h3>
      <AttachmentGallery items={items} />
      <ImageUploader entityType={entityType} entityId={entityId} />
    </section>
  );
}
