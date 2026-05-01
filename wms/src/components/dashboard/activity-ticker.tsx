"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmtAction } from "@/lib/utils";

type AuditEvent = {
  id: string;
  action: string;
  createdAt: Date | string;
  warehouse: { code: string } | null;
};

const PIXELS_PER_SECOND = 35; // ambient pace; adjust to taste

/**
 * Ambient activity ticker. Marquee of the latest audit events. Pauses on
 * hover. Honors prefers-reduced-motion (becomes a static, scrollable list).
 */
export function ActivityTicker({ events }: { events: AuditEvent[] }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  // `relTime` uses Date.now() which differs between SSR and CSR, so we wait
  // until after mount before rendering any items. The marquee track also
  // only meaningfully animates client-side, so this costs nothing visually.
  const [mounted, setMounted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackWidthRef = useRef(0);
  const x = useMotionValue(0);

  // Latest 8 events. We render the list twice so the marquee can wrap
  // seamlessly: as soon as the first copy scrolls past, we snap +trackWidth
  // and the second copy is already in place.
  const items = events.slice(0, 8);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      trackWidthRef.current = entry.contentRect.width / 2;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  useAnimationFrame((_, delta) => {
    if (reduce || paused) return;
    const w = trackWidthRef.current;
    if (w <= 0) return;
    let next = x.get() - (PIXELS_PER_SECOND * delta) / 1000;
    if (next <= -w) next += w;
    x.set(next);
  });

  if (items.length === 0) {
    return (
      <section aria-label="Live activity" className="border-y border-slate-200/60 py-3 dark:border-white/[0.06]">
        <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Quiet · no recent activity
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Live activity" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live activity
        </div>
        <Link
          href="/admin/audit"
          className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
        >
          Open audit log →
        </Link>
      </div>

      <div
        suppressHydrationWarning
        className="border-y border-slate-200/60 py-3 dark:border-white/[0.06]"
      >
        <div
          className="relative h-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {!mounted ? null : reduce ? (
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {items.map((e) => (
                <Item key={e.id} event={e} />
              ))}
            </ul>
          ) : (
            <motion.div
              ref={trackRef}
              style={{ x }}
              className="flex w-max gap-8 will-change-transform"
            >
              {[...items, ...items].map((e, i) => (
                <Item key={`${e.id}-${i}`} event={e} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

function Item({ event }: { event: AuditEvent }) {
  const dot = colorFor(event.action);
  return (
    <Link
      href={`/admin/audit?id=${event.id}`}
      className="group inline-flex shrink-0 items-center gap-2 text-[12.5px] text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-gray-50"
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`}
      />
      <span className="font-medium">{fmtAction(event.action)}</span>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        · {event.warehouse?.code ?? "—"} · {relTime(event.createdAt)}
      </span>
    </Link>
  );
}

function colorFor(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("delete") || lower.includes("cancel") || lower.includes("error")) {
    return "bg-rose-500";
  }
  if (lower.includes("create") || lower.includes("insert") || lower.includes("ship")) {
    return "bg-emerald-500";
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("change")) {
    return "bg-amber-500";
  }
  return "bg-slate-400 dark:bg-slate-500";
}

function relTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}
