"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md";
}

function getFillColor(pct: number): string {
  if (pct >= 100) return "bg-success-500";
  if (pct >= 50) return "bg-primary-500";
  return "bg-warning-500";
}

export default function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  size = "md",
}: ProgressBarProps) {
  const prefersReduced = useReducedMotion();
  const clamped = Math.min(Math.max(value, 0), max);
  const pct = max > 0 ? Math.round((clamped / max) * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-1">
      {(label || showPercentage) && (
        <div className="flex items-baseline justify-between text-xs">
          {label && (
            <span className="font-medium text-neutral-700">{label}</span>
          )}
          {showPercentage && (
            <span className="tabular-nums text-neutral-500">
              {clamped}/{max} ({pct}%)
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-neutral-200",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Progress"}
      >
        <motion.div
          className={cn("h-full rounded-full", getFillColor(pct))}
          initial={{ width: prefersReduced ? `${pct}%` : "0%" }}
          animate={{ width: `${pct}%` }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: 0.6, ease: [0.25, 1, 0.5, 1] }
          }
        />
      </div>
    </div>
  );
}
