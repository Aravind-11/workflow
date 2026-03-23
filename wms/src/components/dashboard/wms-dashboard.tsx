import {
  ArrowDown,
  ArrowUp,
  Package,
  RefreshCw,
  Send,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { DashboardSnapshot } from "@/features/dashboard/service";
import { fmtTime } from "@/lib/utils";

export function WmsDashboard({ data }: { data: DashboardSnapshot }) {
  const { kpis: k } = data;
  const deliveries = k.openShipments + k.dockAppointmentsToday;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            Operations Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time snapshot across deliveries, orders, and inventory.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-navy-border dark:bg-navy-surface dark:text-gray-400">
          <RefreshCw className="h-3.5 w-3.5" />
          Updated {fmtTime(data.generatedAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1 — No of Deliveries */}
        <KpiCard
          label="No of Deliveries"
          value={deliveries}
          icon={Truck}
          trend={{ direction: "up", label: `${k.dockAppointmentsToday} dock appts today` }}
          accent="blue"
        />

        {/* Card 2 — No. of Orders */}
        <KpiCard
          label="No. of Orders"
          value={k.openPurchaseOrders}
          icon={ShoppingCart}
          trend={{ direction: k.openPurchaseOrders > 10 ? "up" : "down", label: "Open purchase orders" }}
          accent="violet"
        />

        {/* Card 3 — Inventory Space */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Inventory Space
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
                {k.inventoryOnHand.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">units on hand</p>
            </div>
            <span className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Available</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-gray-100">
                {(k.inventoryOnHand - k.inventoryReserved).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <ArrowDown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Reserved</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-gray-100">
                {k.inventoryReserved.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Card 4 — Balances, Returns, Orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            System Throughput
          </p>

          <div className="mt-4 space-y-4">
            <StatRow
              label="Balances"
              value={k.inventoryOnHand.toLocaleString()}
              sub="total inventory units"
              icon={Package}
              color="sky"
            />
            <StatRow
              label="Returns"
              value={String(k.returnsAwaitingReview)}
              sub="awaiting review"
              icon={RefreshCw}
              color="amber"
            />
            <StatRow
              label="Orders"
              value={String(k.openPurchaseOrders + k.openShipments)}
              sub="inbound + outbound"
              icon={Send}
              color="violet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: { direction: "up" | "down"; label: string };
  accent: "blue" | "violet";
}) {
  const bg = accent === "blue"
    ? "bg-blue-50 dark:bg-blue-500/10"
    : "bg-violet-50 dark:bg-violet-500/10";
  const iconColor = accent === "blue"
    ? "text-blue-600 dark:text-blue-400"
    : "text-violet-600 dark:text-violet-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
            {value.toLocaleString()}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 ${bg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {trend.direction === "up" ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ArrowUp className="h-3 w-3" /> Up
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <ArrowDown className="h-3 w-3" /> Down
          </span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">{trend.label}</span>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "sky" | "amber" | "violet";
}) {
  const colors = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  };

  return (
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
      <span className={`rounded-lg p-2 ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
      <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
