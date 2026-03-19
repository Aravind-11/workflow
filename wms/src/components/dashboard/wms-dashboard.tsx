import type { AuditLog, User, Warehouse } from "@prisma/client";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
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
import { MetricTile } from "./metric-tile";

type AuditWith = AuditLog & {
  warehouse: Pick<Warehouse, "code" | "name"> | null;
  user: Pick<User, "fullName" | "email"> | null;
};

export function WmsDashboard({ data }: { data: DashboardSnapshot }) {
  const { kpis, lowStockSamples, warehousePerformance, recentAudit, todaysSchedules, upcomingDocks, returnQueueSample } =
    data;
  const k = kpis;

  return (
    <div className="-mx-4 min-h-[calc(100dvh-6rem)] bg-gradient-to-br from-slate-50 via-white to-slate-100/90 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="border-b border-slate-200/80 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl py-6 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Control tower</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Operations dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Real-time snapshot across inventory, inbound, outbound, labor, and exceptions — built for floor
                supervisors and exec reviews.
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm">
                <RefreshCw className="h-3.5 w-3.5" />
                Updated {fmtTime(data.generatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 py-8">
        {/* KPI strip */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Key metrics</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <MetricTile
              href="/warehouses"
              label="Warehouses"
              value={k.totalWarehouses}
              icon={Building2}
              tone="sky"
            />
            <MetricTile
              href="/inventory/balances"
              label="On hand (units)"
              value={k.inventoryOnHand}
              icon={Package}
              tone="emerald"
            />
            <MetricTile
              href="/inventory/catalog"
              label="Low stock SKUs"
              value={k.lowStockCount}
              icon={AlertTriangle}
              tone={k.lowStockCount > 0 ? "amber" : "slate"}
              sub={k.lowStockCount > 0 ? "Below reorder point" : "All SKUs above threshold"}
            />
            <MetricTile
              href="/receiving"
              label="Open POs"
              value={k.openPurchaseOrders}
              icon={ClipboardList}
              tone="violet"
              sub="Awaiting receipt"
            />
            <MetricTile
              href="/receiving"
              label="Open receipts"
              value={k.openReceipts}
              icon={PackageOpen}
              tone="slate"
              sub="Draft or received"
            />
            <MetricTile
              href="/shipping"
              label="Open shipments"
              value={k.openShipments}
              icon={Send}
              tone="sky"
              sub="Not yet shipped"
            />
            <MetricTile
              href="/workers/schedules"
              label="Today's shifts"
              value={k.todaysShifts}
              icon={CalendarClock}
              tone="violet"
            />
            <MetricTile
              href="/tasks"
              label="Overdue tasks"
              value={k.overdueTasks}
              icon={AlertTriangle}
              tone={k.overdueTasks > 0 ? "rose" : "slate"}
            />
            <MetricTile
              href="/deliveries"
              label="Dock appts (today)"
              value={k.dockAppointmentsToday}
              icon={Dock}
              tone="slate"
            />
            <MetricTile
              href="/returns"
              label="Returns in review"
              value={k.returnsAwaitingReview}
              icon={RefreshCw}
              tone={k.returnsAwaitingReview > 0 ? "amber" : "emerald"}
            />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Warehouse performance */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Warehouse performance</h2>
              <Link href="/warehouses" className="text-xs font-medium text-blue-700 hover:underline">
                Directory
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {warehousePerformance.map((w) => (
                <Link
                  key={w.id}
                  href={`/warehouses/${w.id}`}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{w.code}</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-900">{w.name}</p>
                      <p className="text-xs text-slate-500">
                        {w.city}, {w.state}
                      </p>
                    </div>
                    <WarehouseIcon className="h-8 w-8 text-slate-300 transition group-hover:text-blue-500" />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <dt className="text-xs text-slate-500">On hand</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{w.onHandUnits.toLocaleString()}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <dt className="text-xs text-slate-500">Open shipments</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{w.openShipments}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <dt className="text-xs text-slate-500">Active tasks</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{w.activeTasks}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <dt className="text-xs text-slate-500">Pick lists</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{w.openPickLists}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-700 opacity-0 transition group-hover:opacity-100">
                    Open warehouse <ArrowRight className="h-3 w-3" />
                  </p>
                </Link>
              ))}
              {warehousePerformance.length === 0 && (
                <p className="text-sm text-slate-500">No active warehouses configured.</p>
              )}
            </div>

            {lowStockSamples.length > 0 && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                <p className="text-sm font-semibold text-amber-950">Low stock spotlight</p>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-950/90">
                  {lowStockSamples.map((s) => (
                    <li key={s.skuCode} className="flex flex-wrap justify-between gap-2">
                      <span className="font-mono text-xs">{s.skuCode}</span>
                      <span className="text-slate-700">
                        {s.onHand.toLocaleString()} on hand · reorder {s.reorderPoint.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Quick actions + activity */}
          <aside className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Quick actions</h2>
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
              <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
                {(recentAudit as AuditWith[]).map((a) => (
                  <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="font-medium text-slate-800">{fmtAction(a.action)}</p>
                    <p className="text-xs text-slate-500">
                      {a.warehouse?.code ?? "—"} · {fmtTime(a.createdAt)}
                    </p>
                    {a.user ? (
                      <p className="text-xs text-slate-400">{a.user.fullName ?? a.user.email}</p>
                    ) : null}
                  </li>
                ))}
                {recentAudit.length === 0 && <li className="text-slate-500">No audit entries yet.</li>}
              </ul>
            </div>
          </aside>
        </div>

        {/* Bottom bands */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Today&apos;s shifts</h2>
              <Link href="/workers/schedules" className="text-xs font-medium text-blue-700 hover:underline">
                Schedules
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {todaysSchedules.map((s) => (
                <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-50 pb-2 last:border-0">
                  <span className="font-medium text-slate-800">
                    {s.workerProfile.firstName} {s.workerProfile.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{s.warehouse.code}</span>
                  <span className="w-full text-xs text-slate-600">
                    {s.shift.name} · {s.shift.startTime}–{s.shift.endTime} · {s.status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
              {todaysSchedules.length === 0 && <li className="text-slate-500">No shifts scheduled today.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Dock appointments</h2>
              <Link href="/deliveries" className="text-xs font-medium text-blue-700 hover:underline">
                Deliveries
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {upcomingDocks.map((d) => (
                <li key={d.id} className="border-b border-slate-50 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-slate-800">{d.appointmentCode}</span>
                    <span className="text-xs text-slate-500">{d.warehouse.code}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {d.carrier} · {d.dockDoor}
                  </p>
                  <p className="text-xs text-slate-500">{fmtTime(d.scheduledStart)} – {fmtTime(d.scheduledEnd)}</p>
                </li>
              ))}
              {upcomingDocks.length === 0 && <li className="text-slate-500">No upcoming dock windows.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Returns awaiting review</h2>
              <Link href="/returns" className="text-xs font-medium text-blue-700 hover:underline">
                Queue
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {returnQueueSample.map((r) => (
                <li key={r.id} className="border-b border-slate-50 pb-2 last:border-0">
                  <Link href={`/returns/${r.id}`} className="font-mono text-xs font-semibold text-blue-800 hover:underline">
                    {r.rmaNumber}
                  </Link>
                  <p className="text-slate-700">{r.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {r.warehouse.code} · {r.status.replace(/_/g, " ")}
                    {r.exceptionReasonCode ? ` · ${r.exceptionReasonCode}` : ""}
                  </p>
                </li>
              ))}
              {returnQueueSample.length === 0 && <li className="text-slate-500">No returns in review.</li>}
            </ul>
          </section>
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
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </span>
      <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
    </Link>
  );
}
