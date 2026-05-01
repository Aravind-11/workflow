"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Editorial page header used across the main tabs (warehouses, projects,
 * workflow, workers, schedules). Mirrors the dashboard hero's typography
 * so the surface looks like one product.
 *
 * Pattern:
 *   Mono uppercase eyebrow · h1 (tracking-tight) · subtle subhead · optional CTA
 *
 * The header word-stagger-fades on mount. Subhead and CTA cross-fade in.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  /** Optional. Skip when a sibling sub-nav already labels the section. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  // Word-stagger split — same trick the dashboard hero uses. Keeps the
  // animation tasteful (one beat per word, not per letter).
  const words = title.split(" ");

  return (
    <motion.section
      className="flex flex-wrap items-end justify-between gap-4 pb-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`text-[28px] font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-gray-50 sm:text-[32px] ${
            eyebrow ? "mt-2" : ""
          }`}
        >
          {words.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08 + i * 0.06,
                duration: 0.5,
                ease: EASE,
              }}
              className="mr-[0.22em] inline-block"
            >
              {w}
            </motion.span>
          ))}
        </h1>
        {subtitle ? (
          <motion.p
            className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
          >
            {subtitle}
          </motion.p>
        ) : null}
      </div>

      {actions ? (
        <motion.div
          className="flex shrink-0 items-center gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4, ease: EASE }}
        >
          {actions}
        </motion.div>
      ) : null}
    </motion.section>
  );
}

/**
 * Hairline filter strip used by directory pages. No outer border / no card
 * — labels sit above their controls in mono caps, controls share a single
 * baseline. Designed to plug straight underneath PageHeader.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <motion.form
      method="get"
      className="flex flex-wrap items-end gap-x-5 gap-y-3 border-y border-slate-200/60 py-4 dark:border-white/[0.06]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.form>
  );
}

/** Slim, borderless field for FilterBar. Mono uppercase label on top. */
export function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-[10rem] flex-col gap-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Shared input style for FilterBar inputs/selects. */
export const filterControlClass =
  "h-9 rounded-md border border-slate-200/70 bg-white px-3 text-[13px] text-slate-800 outline-none transition-colors duration-150 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-100 dark:hover:border-white/[0.16] dark:focus:border-white/[0.24] dark:focus:ring-white/[0.06]";
