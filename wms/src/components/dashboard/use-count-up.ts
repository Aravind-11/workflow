"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Tween a numeric value from 0 → target.
 *
 * - Honors prefers-reduced-motion (jumps straight to the value).
 * - When `enabled` flips from false→true the animation kicks off.
 *   Default `enabled=true` preserves the original "animate on mount" behaviour;
 *   pass `useInView(ref)` to defer the count-up until the element scrolls
 *   into the viewport so users actually *see* it tick.
 *
 * Returns the live current value so the caller can render it formatted.
 */
export function useCountUp(
  target: number,
  duration = 1.6,
  delay = 0,
  enabled = true,
): number {
  const reduce = useReducedMotion();
  // ALWAYS initialise at 0 — `useReducedMotion()` returns different values
  // on the server vs. the client's first render, so any reduce-motion-aware
  // initial state would cause hydration mismatch. The effect below either
  // snaps to `target` (reduce) or animates 0 → target when enabled.
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (reduce) {
      // Snap to final value for prefers-reduced-motion users.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, duration, delay, reduce, enabled]);

  return value;
}
