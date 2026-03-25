"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Upload } from "lucide-react";
import { uploadAttachment } from "@/features/attachments/actions";

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUploader({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        setStatus("Only image files are supported.");
        return;
      }

      setStatus(`Uploading ${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}...`);

      startTransition(async () => {
        let success = 0;
        let lastError = "";

        for (const file of imageFiles) {
          try {
            const { base64, mimeType } = await compressImage(file);
            const result = await uploadAttachment({
              entityType,
              entityId,
              fileName: file.name,
              mimeType,
              data: base64,
            });
            if (result.ok) {
              success++;
            } else {
              lastError = result.error;
            }
          } catch {
            lastError = "Failed to process image";
          }
        }

        if (success === imageFiles.length) {
          setStatus(`${success} image${success > 1 ? "s" : ""} uploaded`);
        } else if (success > 0) {
          setStatus(`${success} uploaded, some failed: ${lastError}`);
        } else {
          setStatus(`Upload failed: ${lastError}`);
        }

        setTimeout(() => setStatus(null), 4000);
      });
    },
    [entityType, entityId],
  );

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10"
            : "border-gray-300 bg-gray-50/50 dark:border-navy-border dark:bg-navy"
        } ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Drag & drop images here, or use the buttons below
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50 dark:bg-navy-surface dark:text-gray-300 dark:ring-navy-border dark:hover:bg-white/5"
          >
            <ImagePlus className="h-4 w-4" />
            Browse files
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50 dark:bg-navy-surface dark:text-gray-300 dark:ring-navy-border dark:hover:bg-white/5"
          >
            <Camera className="h-4 w-4" />
            Take photo
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Status */}
      {status && (
        <p className={`text-xs font-medium ${status.includes("failed") || status.includes("Only") ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
