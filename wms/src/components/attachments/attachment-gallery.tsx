"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { deleteAttachment, type AttachmentRow } from "@/features/attachments/actions";

function dataUri(row: AttachmentRow) {
  return `data:${row.mimeType};base64,${row.data}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttachmentGallery({ items }: { items: AttachmentRow[] }) {
  const [lightbox, setLightbox] = useState<AttachmentRow | null>(null);
  const [deleting, startDelete] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this attachment?")) return;
    startDelete(async () => {
      await deleteAttachment(id);
    });
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
        No attachments yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-navy-border dark:bg-navy-surface ${deleting ? "opacity-50" : ""}`}
          >
            <button
              type="button"
              onClick={() => setLightbox(item)}
              className="block w-full"
            >
              <img
                src={dataUri(item)}
                alt={item.fileName}
                className="aspect-square w-full object-cover"
              />
            </button>
            <div className="px-2 py-1.5">
              <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300" title={item.fileName}>
                {item.fileName}
              </p>
              <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                {item.uploaderName} · {formatDate(item.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={deleting}
              className="absolute right-1.5 top-1.5 rounded-lg bg-black/50 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-navy-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={dataUri(lightbox)}
              alt={lightbox.fileName}
              className="max-h-[80vh] max-w-full object-contain"
            />
            <div className="border-t border-gray-200 px-4 py-3 dark:border-navy-border">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{lightbox.fileName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Uploaded by {lightbox.uploaderName} · {formatDate(lightbox.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
