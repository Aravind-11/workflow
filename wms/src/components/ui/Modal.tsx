"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_0_0_1px_rgb(15_23_42_/_0.1),0_24px_64px_-16px_rgb(15_23_42_/_0.3)] dark:bg-[rgb(12_16_24_/_0.95)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08),0_24px_64px_-12px_rgb(0_0_0_/_0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
