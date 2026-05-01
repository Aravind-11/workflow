import { getSelectedWarehouseId } from "@/lib/warehouse-context";
import {
  getThroughputByStage,
  getDwellTimeByStage,
  getTaskCompletionStats,
  getWorkerProductivity,
} from "@/features/analytics/service";
import { BarChart3, Clock, Users, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const warehouseId = await getSelectedWarehouseId();

  if (!warehouseId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        Select a warehouse to view analytics.
      </p>
    );
  }

  const [throughput, dwellTimes, taskStats, workerStats] = await Promise.all([
    getThroughputByStage(warehouseId),
    getDwellTimeByStage(warehouseId),
    getTaskCompletionStats(warehouseId),
    getWorkerProductivity(warehouseId),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Operational insights for the last 30 days.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          label="Total Tasks"
          value={taskStats.total}
        />
        <KPICard
          icon={<CheckCircle className="h-5 w-5 text-blue-500" />}
          label="Completed"
          value={taskStats.completed}
        />
        <KPICard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Open"
          value={taskStats.open}
        />
        <KPICard
          icon={<BarChart3 className="h-5 w-5 text-violet-500" />}
          label="Completion Rate"
          value={`${taskStats.completionRate}%`}
        />
      </div>

      {/* Throughput */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <BarChart3 className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
          Throughput by Stage (Last 30 Days)
        </h2>
        {throughput.length === 0 ? (
          <p className="text-sm text-gray-400">No tracking events in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  {Object.keys(throughput[0])
                    .filter((k) => k !== "date")
                    .map((stage) => (
                      <th key={stage} className="px-3 py-2">{stage}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {throughput.slice(-14).map((row) => (
                  <tr key={row.date} className="border-t border-gray-100 dark:border-navy-border">
                    <td className="px-3 py-2 font-mono text-xs">{row.date}</td>
                    {Object.entries(row)
                      .filter(([k]) => k !== "date")
                      .map(([stage, count]) => (
                        <td key={stage} className="px-3 py-2">{Number(count)}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dwell Times */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Clock className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
          Average Dwell Time by Stage
        </h2>
        {dwellTimes.length === 0 ? (
          <p className="text-sm text-gray-400">Not enough data to calculate dwell times.</p>
        ) : (
          <div className="space-y-3">
            {dwellTimes.map((d) => (
              <div key={d.stage} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                  {d.stage}
                </span>
                <div className="flex-1">
                  <div className="h-6 rounded-full bg-gray-100 dark:bg-white/5">
                    <div
                      className="flex h-6 items-center rounded-full bg-blue-500 px-2 text-xs font-medium text-white"
                      style={{
                        width: `${Math.min(100, (d.avgHours / Math.max(...dwellTimes.map((x) => x.avgHours))) * 100)}%`,
                        minWidth: "3rem",
                      }}
                    >
                      {d.avgHours}h avg
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  max {d.maxHours}h · {d.count} items
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker Productivity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Users className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
          Worker Productivity (Events Processed)
        </h2>
        {workerStats.length === 0 ? (
          <p className="text-sm text-gray-400">No worker activity recorded.</p>
        ) : (
          <div className="space-y-2">
            {workerStats.map((w, idx) => (
              <div key={w.worker} className="flex items-center gap-4">
                <span className="w-6 text-right text-xs text-gray-400">{idx + 1}</span>
                <span className="w-40 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                  {w.worker}
                </span>
                <div className="flex-1">
                  <div className="h-5 rounded-full bg-gray-100 dark:bg-white/5">
                    <div
                      className="flex h-5 items-center rounded-full bg-green-500 px-2 text-[10px] font-medium text-white"
                      style={{
                        width: `${Math.min(100, (w.eventCount / workerStats[0].eventCount) * 100)}%`,
                        minWidth: "2rem",
                      }}
                    >
                      {w.eventCount}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}
