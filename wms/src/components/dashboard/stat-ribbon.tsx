"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Dock,
  Package,
  PackageOpen,
  RefreshCw,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ComponentType } from "react";
import { useCountUp } from "./use-count-up";

type StatDef = {
  href: string;
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  warn?: boolean;
};

/**
 * Editorial stat ribbon. Single horizontal row with hairline dividers,
 * no card chrome. Numbers count up on first paint. The 5 most operationally
 * urgent metrics are pinned; the rest live behind an "All metrics" disclosure.
 */
export function StatRibbon({
  kpis,
}: {
  kpis: {
    totalWarehouses: number;
    inventoryOnHand: number;
    lowStockCount: number;
    openPurchaseOrders: number;
    openReceipts: number;
    openShipments: number;
    todaysShifts: number;
    overdueTasks: number;
    dockAppointmentsToday: number;
    returnsAwaitingReview: number;
  };
}) {
  const [showMore, setShowMore] = useState(false);

  const pinned: StatDef[] = [
    {
      href: "/shipping",
      label: "Open shipments",
      value: kpis.openShipments,
      icon: Send,
    },
    {
      href: "/tasks",
      label: "Overdue tasks",
      value: kpis.overdueTasks,
      icon: AlertTriangle,
      warn: kpis.overdueTasks > 0,
    },
    {
      href: "/inventory/catalog",
      label: "Low stock SKUs",
      value: kpis.lowStockCount,
      icon: AlertTriangle,
      warn: kpis.lowStockCount > 0,
    },
    {
      href: "/receiving",
      label: "Open POs",
      value: kpis.openPurchaseOrders,
      icon: ClipboardList,
    },
    {
      href: "/workers/schedules",
      label: "Today's shifts",
      value: kpis.todaysShifts,
      icon: CalendarClock,
    },
  ];

  const more: StatDef[] = [
    {
      href: "/warehouses",
      label: "Warehouses",
      value: kpis.totalWarehouses,
      icon: Building2,
    },
    {
      href: "/inventory/balances",
      label: "On hand (units)",
      value: kpis.inventoryOnHand,
      icon: Package,
    },
    {
      href: "/receiving",
      label: "Open receipts",
      value: kpis.openReceipts,
      icon: PackageOpen,
    },
    {
      href: "/deliveries",
      label: "Dock appts",
      value: kpis.dockAppointmentsToday,
      icon: Dock,
    },
    {
      href: "/returns",
      label: "Returns in review",
      value: kpis.returnsAwaitingReview,
      icon: RefreshCw,
    },
  ];

  // Defer the count-up until the ribbon is actually scrolled into view —
  // otherwise small numbers (5, 10, 0) finish ticking before the user even
  // reads them. `once: true` guarantees the animation only fires the first
  // time per page load.
  const ribbonRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ribbonRef, { once: true, amount: 0.4 });

  return (
    <section aria-label="Key metrics" ref={ribbonRef}>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max snap-x snap-mandatory divide-x divide-slate-200/60 dark:divide-white/[0.06] lg:min-w-0 lg:grid lg:grid-cols-5 lg:divide-x">
          {pinned.map((s, i) => (
            <Stat key={s.label} stat={s} index={i} enabled={inView} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="group inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
        >
          {showMore ? "Hide" : "All metrics"}
          <motion.span
            animate={{ rotate: showMore ? 180 : 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex"
          >
            <ChevronDown className="h-3 w-3" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showMore && (
          <motion.div
            key="more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max divide-x divide-slate-200/60 dark:divide-white/[0.06] lg:min-w-0 lg:grid lg:grid-cols-5 lg:divide-x">
                {more.map((s, i) => (
                  <Stat key={s.label} stat={s} index={i} enabled={showMore} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Stat({
  stat,
  index = 0,
  enabled = true,
}: {
  stat: StatDef;
  index?: number;
  enabled?: boolean;
}) {
  // Stagger the count-up start across tiles (120ms apart) so the eye reads
  // them as a clear left-to-right wave. We deliberately use a slow 1.8s
  // tween — even small numbers (5, 10) need that long to *visibly* tick
  // through every integer.
  const v = useCountUp(stat.value, 1.8, index * 0.12, enabled);
  const Icon = stat.icon;
  const display = Math.round(v).toLocaleString();
  return (
    <Link
      href={stat.href}
      className="group relative flex min-w-[140px] snap-start flex-col gap-2 px-5 py-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] first:pl-0 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors duration-200 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-gray-100">
          {stat.label}
        </span>
        <motion.span
          whileHover={{ scale: 1.15, rotate: -4 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-opacity duration-200 ${
            stat.warn
              ? "text-amber-500 opacity-100 dark:text-amber-400"
              : "text-slate-400 opacity-40 group-hover:opacity-100 dark:text-slate-500"
          }`}
        >
          <Icon className="h-3 w-3" />
        </motion.span>
      </div>

      <motion.div
        suppressHydrationWarning
        className="flex items-baseline gap-2"
        // Spring-pop the whole baseline row when the count-up kicks off.
        // Putting the animation on a single wrapper (rather than the inner
        // <span>) keeps SSR and client serialization in sync — framer
        // serializes the same inline style on either side for this node.
        initial={{ opacity: 0, y: 12, scale: 0.94 }}
        animate={
          enabled
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 12, scale: 0.94 }
        }
        transition={{
          delay: index * 0.12,
          type: "spring",
          stiffness: 220,
          damping: 22,
          mass: 0.8,
        }}
      >
        <span
          className={`inline-block font-mono text-[28px] font-semibold leading-none tracking-tight tabular-nums transition-colors duration-200 ${
            stat.warn
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-gray-50"
          }`}
        >
          {display}
        </span>
        {stat.warn && stat.value > 0 && (
          <motion.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={enabled ? { scale: 1 } : { scale: 0 }}
            transition={{
              delay: index * 0.12 + 1.6,
              type: "spring",
              stiffness: 380,
              damping: 18,
            }}
            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgb(251_191_36_/_0.18)]"
          />
        )}
      </motion.div>

      <span
        aria-hidden
        className="absolute bottom-0 left-0 right-5 h-px origin-left scale-x-0 bg-slate-900 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 dark:bg-gray-100"
      />
    </Link>
  );
}
