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

const ICON_BADGE = "rounded-xl bg-blue-50 p-2.5 dark:bg-blue-500/10";
const ICON_COLOR = "h-5 w-5 text-blue-600 dark:text-blue-400";

export function WmsDashboard({ data }: { data: DashboardSnapshot }) {
  const { kpis: k } = data;
  const deliveries = k.openShipments + k.dockAppointmentsToday;

  return (
    <div className="min-w-0 space-y-6">
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

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
        <KpiCard
          label="No of Deliveries"
          value={deliveries}
          icon={Truck}
          trend={{ direction: "up", label: `${k.dockAppointmentsToday} dock appts today` }}
        />

        <KpiCard
          label="No. of Orders"
          value={k.openPurchaseOrders}
          icon={ShoppingCart}
          trend={{ direction: k.openPurchaseOrders > 10 ? "up" : "down", label: "Open purchase orders" }}
        />

        {/* Inventory Space */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Inventory Space
              </p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
                {k.inventoryOnHand.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">units on hand</p>
            </div>
            <span className={ICON_BADGE}>
              <Package className={ICON_COLOR} />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Available</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-gray-100">
                {(k.inventoryOnHand - k.inventoryReserved).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
              <div className="flex items-center gap-1.5">
                <ArrowDown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Reserved</span>
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-gray-100">
                {k.inventoryReserved.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* System Throughput */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            System Throughput
          </p>

          <div className="mt-4 space-y-4">
            <StatRow label="Balances" value={k.inventoryOnHand.toLocaleString()} sub="total inventory units" icon={Package} />
            <StatRow label="Returns" value={String(k.returnsAwaitingReview)} sub="awaiting review" icon={RefreshCw} />
            <StatRow label="Orders" value={String(k.openPurchaseOrders + k.openShipments)} sub="inbound + outbound" icon={Send} />
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
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: { direction: "up" | "down"; label: string };
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
            {value.toLocaleString()}
          </p>
        </div>
        <span className={ICON_BADGE}>
          <Icon className={ICON_COLOR} />
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
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
      <span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      </div>
      <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
