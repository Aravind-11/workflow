"use client";

import { motion } from "motion/react";
import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MAX_STAGGER_ITEMS = 15;
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export function AnimatedList({
  children,
  className,
  staggerMs = 30,
}: {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
}) {
  const items = Children.toArray(children);
  const staggerSec = staggerMs / 1000;

  return (
    <div className={cn(className)}>
      {items.map((child, index) => {
        const cappedIndex = Math.min(index, MAX_STAGGER_ITEMS);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: cappedIndex * staggerSec,
              duration: 0.35,
              ease: EASE_OUT_QUART,
            }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}
