"use client";

import { AnimatePresence, motion } from "motion/react";

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

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
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-neutral-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-surface-raised p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{
              duration: 0.25,
              ease: EASE_OUT_QUART,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{title}</h2>
              <button onClick={onClose} className="text-sm text-neutral-500">
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
