"use client";

/**
 * Motion primitives shared across pages.
 *
 * <Reveal>          — fades + slides a child in the first time it enters
 *                     the viewport. Once-only by default. Best for *long*
 *                     pages (dashboard) where you want sequential reveals
 *                     as the user scrolls.
 * <PageFade>        — fades + slides a child in once on mount. Best for
 *                     directory/list pages where the body must appear
 *                     immediately and not depend on the IntersectionObserver
 *                     ever firing.
 * <ScrollProgress>  — Linear-style 1.5px amber bar pinned to the very top
 *                     of the viewport that fills with vertical scroll.
 *
 * All honour `prefers-reduced-motion`.
 */

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className = "",
  amount = 0.2,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** 0–1, fraction of element that must be in view before firing. */
  amount?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ y, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Single-shot fade + slight slide on mount. Renders the *child* immediately
 * with opacity 0 and tweens it into view — never waits for IntersectionObserver,
 * so it works on pages where the parent scroll container is unusual.
 */
export function PageFade({
  children,
  delay = 0,
  y = 8,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ y, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Thin progress bar at the very top of the page. Uses `scrollYProgress`
 * (0 → 1) mapped to `scaleX`. Spring-smoothed so it feels analog rather
 * than reactive.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[1.5px] bg-gradient-to-r from-amber-400/0 via-amber-400/80 to-amber-400/0"
    />
  );
}
