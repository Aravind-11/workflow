"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileText, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadDocumentAction,
  deleteDocumentAction,
} from "@/features/documents/actions";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(mimeType: string) {
  return mimeType.startsWith("image/");
}

interface FileUploadProps {
  entityType: string;
  entityId: string;
  documents: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    publicUrl: string;
    storagePath: string;
    createdAt: string;
  }>;
  onUploadComplete?: () => void;
}

export function FileUpload({
  entityType,
  entityId,
  documents,
  onUploadComplete,
}: FileUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setError(null);

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("entityType", entityType);
        formData.set("entityId", entityId);

        const result = await uploadDocumentAction(formData);
        if (!result.ok) {
          setError(result.error);
          break;
        }
      }

      setUploading(false);
      router.refresh();
      onUploadComplete?.();
    },
    [entityType, entityId, router, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  async function handleDelete(id: string, storagePath: string) {
    setError(null);
    await deleteDocumentAction(id, storagePath);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragActive
            ? "border-primary-500 bg-primary-50"
            : "border-border bg-surface-inset hover:border-primary-400 hover:bg-primary-50/30",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-neutral-400" />
        {uploading ? (
          <p className="text-sm text-neutral-500">Uploading…</p>
        ) : isDragActive ? (
          <p className="text-sm font-medium text-primary-600">
            Drop files here
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-700">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-neutral-400">
              Images, PDF, Word — up to 10 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {documents.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 bg-surface-raised px-4 py-3 first:rounded-t-lg last:rounded-b-lg"
            >
              {isImageType(doc.mimeType) ? (
                <img
                  src={doc.publicUrl}
                  alt={doc.fileName}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <FileText className="h-10 w-10 shrink-0 text-neutral-400" />
              )}

              <div className="min-w-0 flex-1">
                <a
                  href={doc.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-neutral-800 hover:underline"
                >
                  {doc.fileName}
                </a>
                <p className="text-xs text-neutral-400">
                  {formatBytes(doc.sizeBytes)} ·{" "}
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(doc.id, doc.storagePath)}
                className="shrink-0 rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
