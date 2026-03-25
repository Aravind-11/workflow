"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

export type PendingImage = {
  fileName: string;
  mimeType: string;
  base64: string;
  preview: string;
};

function compressImage(file: File): Promise<PendingImage> {
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
      resolve({
        fileName: file.name,
        mimeType: "image/jpeg",
        base64,
        preview: dataUrl,
      });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function PendingImagePicker({
  images,
  onChange,
}: {
  images: PendingImage[];
  onChange: (imgs: PendingImage[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      setProcessing(true);
      const results: PendingImage[] = [];
      for (const file of imageFiles) {
        try {
          results.push(await compressImage(file));
        } catch {
          /* skip unreadable files */
        }
      }
      onChange([...images, ...results]);
      setProcessing(false);
    },
    [images, onChange],
  );

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={processing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-navy-border dark:bg-navy dark:text-gray-400 dark:hover:bg-white/5"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Browse
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={processing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-navy-border dark:bg-navy dark:text-gray-400 dark:hover:bg-white/5"
        >
          <Camera className="h-3.5 w-3.5" />
          Camera
        </button>
        {processing && (
          <span className="self-center text-xs text-gray-400">Processing...</span>
        )}
      </div>

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

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 dark:border-navy-border">
              <img src={img.preview} alt={img.fileName} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
