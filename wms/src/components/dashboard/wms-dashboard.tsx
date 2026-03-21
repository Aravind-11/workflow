import type { AuditLog, User, Warehouse } from "@prisma/client";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Dock,
  Package,
  PackageOpen,
  RefreshCw,
  Send,
  Truck,
  Users,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import type { DashboardSnapshot } from "@/features/dashboard/service";
import { fmtTime, fmtAction } from "@/lib/utils";
import { AnimatedList } from "@/components/ui/animated-list";
import { MetricTile } from "./metric-tile";
import { CollapsibleSection } from "./collapsible-section";

type AuditWith = AuditLog & {
  warehouse: Pick<Warehouse, "code" | "name"> | null;
  user: Pick<User, "fullName" | "email"> | null;
};

export function WmsDashboard({ data }: { data: DashboardSnapshot }) {
  const { kpis, lowStockSamples, warehousePerformance, recentAudit, todaysSchedules, upcomingDocks, returnQueueSample } =
    data;
  const k = kpis;

  const hasPriority = k.overdueTasks > 0 || k.lowStockCount > 0 || k.returnsAwaitingReview > 0;

  return (
    <div className="min-h-[calc(100dvh-6rem)] overflow-x-hidden bg-gradient-to-br from-neutral-50 via-surface to-neutral-100/90">
      {/* ── Header ── */}
      <div className="border-b border-border bg-surface-raised/70 backdrop-blur-sm">
        <div className="py-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Control tower</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">Operations dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
                Real-time snapshot across inventory, inbound, outbound, labor, and exceptions — built for floor
                supervisors and exec reviews.
              </p>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 font-medium text-neutral-700 shadow-sm">
                <RefreshCw className="h-3.5 w-3.5" />
                Updated {fmtTime(data.generatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 py-8">
        {/* ── Priority strip ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Attention needed</h2>
          {hasPriority ? (
            <AnimatedList className="flex flex-wrap gap-3" staggerMs={50}>
              {k.overdueTasks > 0 && (
                <MetricTile
                  href="/tasks"
                  label="Overdue tasks"
                  value={k.overdueTasks}
                  icon={AlertTriangle}
                  tone="rose"
                  variant="compact"
                />
              )}
              {k.lowStockCount > 0 && (
                <MetricTile
                  href="/inventory/catalog"
                  label="Low stock SKUs"
                  value={k.lowStockCount}
                  icon={AlertTriangle}
                  tone="amber"
                  variant="compact"
                />
              )}
              {k.returnsAwaitingReview > 0 && (
                <MetricTile
                  href="/returns"
                  label="Returns in review"
                  value={k.returnsAwaitingReview}
                  icon={RefreshCw}
                  tone="amber"
                  variant="compact"
                />
              )}
            </AnimatedList>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
              <CheckCircle2 className="h-4 w-4" />
              All clear — no items need attention right now.
            </div>
          )}
        </section>

        {/* ── Main two-column layout ── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* LEFT column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Health bar */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Health bar</h2>
              <AnimatedList className="flex flex-wrap gap-3" staggerMs={40}>
                <MetricTile href="/warehouses" label="Warehouses" value={k.totalWarehouses} icon={Building2} variant="compact" />
                <MetricTile href="/inventory/balances" label="On hand (units)" value={k.inventoryOnHand} icon={Package} variant="compact" />
                <MetricTile href="/receiving" label="Open POs" value={k.openPurchaseOrders} icon={ClipboardList} variant="compact" />
                <MetricTile href="/shipping" label="Open shipments" value={k.openShipments} icon={Send} variant="compact" />
                <MetricTile href="/workers/schedules" label="Today's shifts" value={k.todaysShifts} icon={CalendarClock} variant="compact" />
              </AnimatedList>
            </section>

            {/* Warehouse performance */}
            <CollapsibleSection id="warehouse-perf" title="Warehouse performance" defaultOpen badge={warehousePerformance.length || undefined}>
              <div className="flex items-center justify-end gap-2 pb-3">
                <Link href="/warehouses" className="text-xs font-medium text-primary-700 hover:underline">
                  Directory
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {warehousePerformance.map((w) => (
                  <Link
                    key={w.id}
                    href={`/warehouses/${w.id}`}
                    className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-neutral-500">{w.code}</p>
                        <p className="mt-0.5 text-lg font-semibold text-neutral-900">{w.name}</p>
                        <p className="text-xs text-neutral-500">
                          {w.city}, {w.state}
                        </p>
                      </div>
                      <WarehouseIcon className="h-8 w-8 text-neutral-300 transition group-hover:text-primary-500" />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-surface-inset px-3 py-2">
                        <dt className="text-xs text-neutral-500">On hand</dt>
                        <dd className="font-semibold tabular-nums text-neutral-900">{w.onHandUnits.toLocaleString()}</dd>
                      </div>
                      <div className="rounded-xl bg-surface-inset px-3 py-2">
                        <dt className="text-xs text-neutral-500">Open shipments</dt>
                        <dd className="font-semibold tabular-nums text-neutral-900">{w.openShipments}</dd>
                      </div>
                      <div className="rounded-xl bg-surface-inset px-3 py-2">
                        <dt className="text-xs text-neutral-500">Active tasks</dt>
                        <dd className="font-semibold tabular-nums text-neutral-900">{w.activeTasks}</dd>
                      </div>
                      <div className="rounded-xl bg-surface-inset px-3 py-2">
                        <dt className="text-xs text-neutral-500">Pick lists</dt>
                        <dd className="font-semibold tabular-nums text-neutral-900">{w.openPickLists}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-700 opacity-0 transition group-hover:opacity-100">
                      Open warehouse <ArrowRight className="h-3 w-3" />
                    </p>
                  </Link>
                ))}
                {warehousePerformance.length === 0 && (
                  <p className="text-sm text-neutral-500">No active warehouses configured.</p>
                )}
              </div>
            </CollapsibleSection>

            {/* Low stock spotlight */}
            {lowStockSamples.length > 0 && (
              <CollapsibleSection id="low-stock" title="Low stock spotlight" defaultOpen badge={lowStockSamples.length}>
                <div className="rounded-2xl border border-warning-100 bg-warning-50/50 p-4">
                  <ul className="space-y-1.5 text-sm text-warning-900">
                    {lowStockSamples.map((s) => (
                      <li key={s.skuCode} className="flex flex-wrap justify-between gap-2">
                        <span className="font-mono text-xs">{s.skuCode}</span>
                        <span className="text-neutral-700">
                          {s.onHand.toLocaleString()} on hand · reorder {s.reorderPoint.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* RIGHT column */}
          <aside className="space-y-6">
            {/* Quick actions */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Quick actions</h2>
              <div className="grid gap-2">
                <QuickAction href="/receiving" icon={Truck} label="Start receiving" hint="Receipts & putaway" />
                <QuickAction href="/shipping" icon={Send} label="Create / manage shipment" hint="Outbound hub" />
                <QuickAction
                  href="/workers/schedules"
                  icon={Users}
                  label="Worker schedule"
                  hint="Shifts & coverage"
                />
                <QuickAction href="/tasks" icon={ClipboardList} label="Create task" hint="Floor work queue" />
              </div>
            </div>

            {/* Recent activity */}
            <CollapsibleSection id="recent-activity" title="Recent activity" defaultOpen badge={recentAudit.length || undefined}>
              <ul className="max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
                {(recentAudit as AuditWith[]).map((a) => (
                  <li key={a.id} className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-neutral-800">{fmtAction(a.action)}</p>
                    <p className="text-xs text-neutral-500">
                      {a.warehouse?.code ?? "—"} · {fmtTime(a.createdAt)}
                    </p>
                    {a.user ? (
                      <p className="text-xs text-neutral-400">{a.user.fullName ?? a.user.email}</p>
                    ) : null}
                  </li>
                ))}
                {recentAudit.length === 0 && <li className="text-neutral-500">No audit entries yet.</li>}
              </ul>
            </CollapsibleSection>
          </aside>
        </div>

        {/* ── Bottom bands ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <CollapsibleSection id="shifts" title="Today's shifts" defaultOpen badge={todaysSchedules.length || undefined}>
            <div className="mb-3 flex items-center justify-end">
              <Link href="/workers/schedules" className="text-xs font-medium text-primary-700 hover:underline">
                Schedules
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {todaysSchedules.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-neutral-50 pb-2 last:border-0">
                  <span className="font-medium text-neutral-800">
                    {s.workerProfile.firstName} {s.workerProfile.lastName}
                  </span>
                  <span className="text-xs text-neutral-500">{s.warehouse.code}</span>
                  <span className="w-full text-xs text-neutral-600">
                    {s.shift.name} · {s.shift.startTime}–{s.shift.endTime} · {s.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
              {todaysSchedules.length === 0 && <li className="text-neutral-500">No shifts scheduled today.</li>}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection id="dock-appts" title="Dock appointments" defaultOpen badge={upcomingDocks.length || undefined}>
            <div className="mb-3 flex items-center justify-end">
              <Link href="/deliveries" className="text-xs font-medium text-primary-700 hover:underline">
                Deliveries
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {upcomingDocks.map((d) => (
                <li key={d.id} className="border-b border-neutral-50 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-neutral-800">{d.appointmentCode}</span>
                    <span className="text-xs text-neutral-500">{d.warehouse.code}</span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    {d.carrier} · {d.dockDoor}
                  </p>
                  <p className="text-xs text-neutral-500">{fmtTime(d.scheduledStart)} – {fmtTime(d.scheduledEnd)}</p>
                </li>
              ))}
              {upcomingDocks.length === 0 && <li className="text-neutral-500">No upcoming dock windows.</li>}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection id="returns" title="Returns awaiting review" defaultOpen badge={returnQueueSample.length || undefined}>
            <div className="mb-3 flex items-center justify-end">
              <Link href="/returns" className="text-xs font-medium text-primary-700 hover:underline">
                Queue
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {returnQueueSample.map((r) => (
                <li key={r.id} className="border-b border-neutral-50 pb-2 last:border-0">
                  <Link href={`/returns/${r.id}`} className="font-mono text-xs font-semibold text-primary-800 hover:underline">
                    {r.rmaNumber}
                  </Link>
                  <p className="text-neutral-700">{r.customerName}</p>
                  <p className="text-xs text-neutral-500">
                    {r.warehouse.code} · {r.status.replace(/_/g, " ")}
                    {r.exceptionReasonCode ? ` · ${r.exceptionReasonCode}` : ""}
                  </p>
                </li>
              ))}
              {returnQueueSample.length === 0 && <li className="text-neutral-500">No returns in review.</li>}
            </ul>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-3 py-3 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-neutral-900">{label}</span>
        <span className="text-xs text-neutral-500">{hint}</span>
      </span>
      <ArrowRight className="ml-auto h-4 w-4 text-neutral-400" />
    </Link>
  );
}
