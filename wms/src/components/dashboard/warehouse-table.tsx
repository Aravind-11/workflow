"use client";

import { motion, useInView } from "framer-motion";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useCountUp } from "./use-count-up";

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  onHandUnits: number;
  openShipments: number;
  activeTasks: number;
  openPickLists: number;
};

type LowStockSample = {
  skuCode: string;
  name: string;
  onHand: number;
  reorderPoint: number;
};

/**
 * Borderless warehouse list. Hairline rows, sticky header. Hover syncs
 * bidirectionally with the globe via `hoveredId` / `onHoverChange`.
 */
export function WarehouseTable({
  rows,
  hoveredId,
  onHoverChange,
  lowStock,
}: {
  rows: WarehouseRow[];
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  lowStock: LowStockSample[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-sm text-slate-500 dark:text-slate-400">
        No active warehouses configured.
      </p>
    );
  }

  // The DashboardSnapshot exposes lowStock as a *global* sample (not per
  // warehouse), so we surface it once as a small caption above the table
  // rather than faking a per-row indicator.
  // Defer count-up until the table scrolls into view — the user explicitly
  // wants to *see* the numbers tick rather than have them already settled.
  const tableRef = useRef<HTMLDivElement>(null);
  const inView = useInView(tableRef, { once: true, amount: 0.15 });

  return (
    <div className="space-y-3" ref={tableRef}>
      {lowStock.length > 0 ? (
        <LowStockCaption count={lowStock.length} samples={lowStock} />
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-[1] bg-white/80 backdrop-blur dark:bg-navy/80">
            <tr>
              <Th className="text-left">Code</Th>
              <Th className="text-left">Warehouse</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Ships</Th>
              <Th className="text-right">Tasks</Th>
              <Th className="text-right">Picks</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((w, i) => {
              const isHovered = hoveredId === w.id;
              // Each row's numbers tick up after a tiny stagger — fast enough
              // that all 10 finish in <2.5s but slow enough that the eye reads
              // it as a wave from top to bottom.
              const numDelay = 0.35 + i * 0.05;
              return (
                <tr
                  key={w.id}
                  onMouseEnter={() => onHoverChange(w.id)}
                  onMouseLeave={() => onHoverChange(null)}
                  className={`group transition-colors duration-200 ${
                    isHovered
                      ? "bg-slate-50/80 dark:bg-white/[0.03]"
                      : "hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <Td>
                    <Link
                      href={`/warehouses/${w.id}`}
                      className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-gray-50"
                    >
                      {w.code}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/warehouses/${w.id}`} className="block min-w-0">
                      <span className="block text-[14px] font-semibold tracking-tight text-slate-900 dark:text-gray-100">
                        {w.name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-slate-500 dark:text-slate-400">
                        {w.city}, {w.state}
                      </span>
                    </Link>
                  </Td>
                  <NumTd value={w.onHandUnits} delay={numDelay} enabled={inView} />
                  <NumTd
                    value={w.openShipments}
                    delay={numDelay + 0.08}
                    enabled={inView}
                  />
                  <NumTd
                    value={w.activeTasks}
                    delay={numDelay + 0.16}
                    enabled={inView}
                  />
                  <NumTd
                    value={w.openPickLists}
                    delay={numDelay + 0.24}
                    enabled={inView}
                  />
                  <Td className="text-right">
                    <Link
                      href={`/warehouses/${w.id}`}
                      aria-label={`Open ${w.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                    >
                      <motion.span
                        animate={isHovered ? { x: 2 } : { x: 0 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </motion.span>
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200/60 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-white/[0.06] dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-200/40 px-3 py-3 align-middle dark:border-white/[0.04] ${className}`}
    >
      {children}
    </td>
  );
}

function NumTd({
  value,
  delay = 0,
  enabled = true,
}: {
  value: number;
  delay?: number;
  enabled?: boolean;
}) {
  // Tween the number from 0 → value with a per-cell stagger so the table
  // fills in like a wave rather than all numbers snapping in at once.
  // Slow enough (1.6s) that even small values like 1 / 2 visibly *tick*
  // instead of just appearing.
  const v = useCountUp(value, 1.6, delay, enabled);
  // Dim a true zero so the eye knows immediately which cells are empty.
  const isZero = value === 0;
  return (
    <Td className="text-right">
      <motion.span
        suppressHydrationWarning
        initial={{ opacity: 0, y: 8, scale: 0.94 }}
        animate={
          enabled
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 8, scale: 0.94 }
        }
        transition={{
          delay,
          type: "spring",
          stiffness: 240,
          damping: 22,
          mass: 0.7,
        }}
        className={`inline-block font-mono text-[13px] tabular-nums ${
          isZero
            ? "text-slate-300 dark:text-slate-600"
            : "text-slate-800 dark:text-gray-200"
        }`}
      >
        {Math.round(v).toLocaleString()}
      </motion.span>
    </Td>
  );
}

function LowStockCaption({
  count,
  samples,
}: {
  count: number;
  samples: LowStockSample[];
}) {
  return (
    <Link
      href="/inventory/catalog"
      className="group inline-flex items-center gap-2 text-[12px] text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
      title={samples
        .slice(0, 6)
        .map((s) => `${s.skuCode}: ${s.onHand}/${s.reorderPoint}`)
        .join("\n")}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgb(251_191_36_/_0.18)]"
      />
      <AlertTriangle className="h-3 w-3 text-amber-500" />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
        {count} SKU{count === 1 ? "" : "s"} below reorder
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 transition-colors group-hover:text-amber-500 dark:text-slate-500">
        review →
      </span>
    </Link>
  );
}
