"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { chooseOperatorAction } from "@/features/start/actions";

const EASE = [0.16, 1, 0.3, 1] as const;

type Warehouse = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  country: string;
  openShipments: number;
  activeTasks: number;
  openReceipts: number;
};

export function OperatorPicker({
  userLabel,
  warehouses,
}: {
  userLabel: string;
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Warm the dashboard as soon as the picker mounts — by the time the user
  // taps a warehouse card the / route is already compiled in dev and the
  // RSC payload is in the router cache, so the redirect feels instant.
  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return warehouses;
    return warehouses.filter((w) => {
      const hay = [
        w.code,
        w.name,
        w.city,
        w.state,
        w.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, warehouses]);

  const choose = (id: string) => {
    setPendingId(id);
    startTransition(() => {
      chooseOperatorAction(id);
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-12 text-slate-100">
      <Backdrop />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 mx-auto w-full max-w-5xl"
      >
        <Link
          href="/start"
          className="mb-8 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-slate-100"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5, ease: EASE }}
          className="mb-8"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-slate-400">
            Operator · {userLabel}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Pick the warehouse you&rsquo;re running today.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-slate-400">
            Your dashboard, KPIs, and operate tabs will all scope to this floor
            until you switch.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className="relative mb-6"
        >
          <Search
            size={15}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code, name, or city…"
            className="w-full rounded-xl bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 ring-1 ring-inset ring-white/10 outline-none transition-all focus:bg-white/[0.07] focus:ring-amber-400/60"
          />
        </motion.div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-sm text-slate-400">
            No warehouses match “{q}”.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w, i) => (
              <WarehouseCard
                key={w.id}
                warehouse={w}
                index={i}
                onClick={() => choose(w.id)}
                pending={pendingId === w.id}
                disabled={pendingId !== null}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function WarehouseCard({
  warehouse,
  index,
  onClick,
  pending,
  disabled,
}: {
  warehouse: Warehouse;
  index: number;
  onClick: () => void;
  pending: boolean;
  disabled: boolean;
}) {
  const w = warehouse;
  const cityState = [w.city, w.state].filter(Boolean).join(", ");
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + Math.min(index, 8) * 0.04, duration: 0.45, ease: EASE }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className="group relative flex flex-col items-start overflow-hidden rounded-2xl bg-white/[0.02] p-5 text-left ring-1 ring-inset ring-white/10 backdrop-blur-xl transition-all hover:ring-amber-400/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-100"
        aria-hidden
        style={{
          background: "radial-gradient(circle, rgb(251 191 36 / 0.2) 0%, transparent 70%)",
        }}
      />

      <div className="flex w-full items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300">
            {w.code}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
            {w.name}
          </h3>
          {cityState && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] text-slate-400">
              <MapPin size={10} />
              {cityState}
            </p>
          )}
        </div>
        {pending ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-amber-300" />
        ) : (
          <ArrowRight
            size={14}
            className="shrink-0 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-amber-300"
          />
        )}
      </div>

      <div className="mt-5 grid w-full grid-cols-3 gap-2">
        <Stat label="Shipments" value={w.openShipments} />
        <Stat label="Tasks" value={w.activeTasks} />
        <Stat label="Receipts" value={w.openReceipts} />
      </div>
    </motion.button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.02] px-2.5 py-2 ring-1 ring-inset ring-white/[0.06]">
      <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold text-white tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-[60vh] -top-[60vh] h-[120vh] w-[120vh] rounded-full bg-amber-500/[0.05] blur-[140px]"
        animate={{ x: [0, 22, 0], y: [0, 16, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[50vh] -bottom-[30vh] h-[100vh] w-[100vh] rounded-full bg-blue-500/[0.05] blur-[140px]"
        animate={{ x: [0, -18, 0], y: [0, -22, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.5) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/80" />
    </div>
  );
}
