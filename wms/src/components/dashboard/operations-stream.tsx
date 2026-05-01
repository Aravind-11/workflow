"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Dock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType } from "react";
import { fmtTime } from "@/lib/utils";

type Schedule = {
  id: string;
  status: string;
  workerProfile: { firstName: string; lastName: string; employeeCode: string };
  shift: { name: string; startTime: string; endTime: string };
  warehouse: { code: string };
};

type DockApt = {
  id: string;
  appointmentCode: string;
  carrier: string;
  dockDoor: string | null;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  warehouse: { code: string };
};

type ReturnRow = {
  id: string;
  rmaNumber: string;
  customerName: string;
  status: string;
  exceptionReasonCode: string | null;
  warehouse: { code: string };
};

type TabId = "shifts" | "docks" | "returns";

const TABS: { id: TabId; label: string; href: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "shifts", label: "Shifts", href: "/workers/schedules", icon: CalendarClock },
  { id: "docks", label: "Docks", href: "/deliveries", icon: Dock },
  { id: "returns", label: "Returns", href: "/returns", icon: RefreshCw },
];

export function OperationsStream({
  shifts,
  docks,
  returns,
}: {
  shifts: Schedule[];
  docks: DockApt[];
  returns: ReturnRow[];
}) {
  const [tab, setTab] = useState<TabId>("shifts");

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <section aria-label="Operations stream" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-slate-100/80 p-1 dark:bg-white/[0.04]">
          {TABS.map((t) => {
            const isActive = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] transition-colors duration-200 ${
                  isActive
                    ? "text-slate-900 dark:text-gray-50"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="ops-tab-pill"
                    className="absolute inset-0 -z-0 rounded-full bg-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.06),0_2px_6px_-2px_rgb(15_23_42_/_0.12)] dark:bg-navy-surface dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08),0_4px_10px_-4px_rgb(0_0_0_/_0.5)]"
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <Icon className="relative z-[1] h-3 w-3" />
                <span className="relative z-[1]">{t.label}</span>
              </button>
            );
          })}
        </div>
        <Link
          href={active.href}
          className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
        >
          View all →
        </Link>
      </div>

      <div className="relative mt-5 min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "shifts" && <ShiftsList items={shifts} />}
            {tab === "docks" && <DocksList items={docks} />}
            {tab === "returns" && <ReturnsList items={returns} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  if (!Array.isArray(children) || children.length === 0) return null;
  return (
    <ol className="relative ml-2 border-l border-slate-200/70 pl-5 dark:border-white/[0.07]">
      {children}
    </ol>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-3 text-[13px] text-slate-500 dark:text-slate-400">{children}</p>
  );
}

function Row({
  icon: Icon,
  primary,
  meta,
  trailing,
}: {
  icon: ComponentType<{ className?: string }>;
  primary: React.ReactNode;
  meta: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="relative flex items-center justify-between gap-3 py-2.5">
      <span
        aria-hidden
        className="absolute -left-[27px] top-3.5 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 dark:bg-navy dark:ring-white/10"
      >
        <Icon className="h-2 w-2 text-slate-500 dark:text-slate-400" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-slate-800 dark:text-gray-200">
          {primary}
        </div>
        <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {meta}
        </div>
      </div>
      {trailing && (
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {trailing}
        </span>
      )}
    </li>
  );
}

function ShiftsList({ items }: { items: Schedule[] }) {
  if (items.length === 0) return <Empty>No shifts scheduled today.</Empty>;
  return (
    <Rail>
      {items.map((s) => (
        <Row
          key={s.id}
          icon={CalendarClock}
          primary={`${s.workerProfile.firstName} ${s.workerProfile.lastName}`}
          meta={`${s.warehouse.code} · ${s.shift.name} · ${s.status.replace(/_/g, " ").toLowerCase()}`}
          trailing={`${s.shift.startTime}–${s.shift.endTime}`}
        />
      ))}
    </Rail>
  );
}

function DocksList({ items }: { items: DockApt[] }) {
  if (items.length === 0) return <Empty>No upcoming dock windows.</Empty>;
  return (
    <Rail>
      {items.map((d) => (
        <Row
          key={d.id}
          icon={Dock}
          primary={
            <span className="font-mono">
              {d.appointmentCode}
              <span className="ml-2 font-sans text-[12px] font-normal text-slate-500 dark:text-slate-400">
                {d.carrier}
                {d.dockDoor ? ` · ${d.dockDoor}` : ""}
              </span>
            </span>
          }
          meta={`${d.warehouse.code} · ${fmtTime(d.scheduledStart)}`}
          trailing={fmtTime(d.scheduledEnd)}
        />
      ))}
    </Rail>
  );
}

function ReturnsList({ items }: { items: ReturnRow[] }) {
  if (items.length === 0) return <Empty>No returns in review.</Empty>;
  return (
    <Rail>
      {items.map((r) => (
        <Row
          key={r.id}
          icon={RefreshCw}
          primary={
            <Link
              href={`/returns/${r.id}`}
              className="font-mono hover:text-amber-600 dark:hover:text-amber-400"
            >
              {r.rmaNumber}
              <span className="ml-2 font-sans text-[12px] font-normal text-slate-700 dark:text-slate-300">
                {r.customerName}
              </span>
            </Link>
          }
          meta={`${r.warehouse.code} · ${r.status.replace(/_/g, " ").toLowerCase()}${r.exceptionReasonCode ? ` · ${r.exceptionReasonCode}` : ""}`}
        />
      ))}
    </Rail>
  );
}
