import { WarehouseSelector } from "@/components/logistics/warehouse-selector";
import {
  listBatchTasks,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString, serialize } from "@/lib/utils";

type BatchTask = {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | Date | null;
  completedAt: string | Date | null;
  workerProfile: { firstName: string; lastName: string } | null;
  location: { locationCode: string } | null;
};

function parseTitle(title: string): { batch: string | null; box: string | null } {
  // Loader writes "Batch <batchName> for <boxId>"
  const m = /^Batch\s+(.+?)\s+for\s+(\S+)/i.exec(title);
  return { batch: m?.[1] ?? null, box: m?.[2] ?? null };
}

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [warehouses, scope] = await Promise.all([
    listWarehousesForSelect(),
    resolveWarehouseScope(pickString(params.warehouseId)),
  ]);
  const warehouseId =
    scope.id
    ?? warehouses.find((w) => w.code === "LACO-MAIL")?.id
    ?? warehouses[0]?.id;
  if (!warehouseId) {
    return <p className="text-sm text-amber-800 dark:text-amber-400">No warehouses configured.</p>;
  }

  const batches = serialize(await listBatchTasks(warehouseId)) as BatchTask[];

  // Stats
  const total = batches.length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = batches.filter((b) => {
    const at = b.completedAt ? new Date(b.completedAt) : null;
    return at && at.getTime() >= startOfToday.getTime();
  }).length;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const weekCount = batches.filter((b) => {
    const at = b.completedAt ? new Date(b.completedAt) : null;
    return at && at.getTime() >= startOfWeek.getTime();
  }).length;

  // Top preppers
  const tally = new Map<string, number>();
  for (const b of batches) {
    if (!b.workerProfile) continue;
    const name = `${b.workerProfile.firstName} ${b.workerProfile.lastName}`.trim();
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  const topPreppers = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      <WarehouseSelector warehouses={warehouses} currentId={warehouseId} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total batches" value={total.toLocaleString()} tint="amber" />
        <SummaryCard label="Today" value={todayCount.toLocaleString()} tint="green" />
        <SummaryCard label="Last 7 days" value={weekCount.toLocaleString()} tint="blue" />
        <SummaryCard label="Active preppers" value={tally.size.toLocaleString()} tint="violet" />
      </section>

      {topPreppers.length > 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top preppers
          </h2>
          <div className="flex flex-wrap gap-2">
            {topPreppers.map(([name, n]) => (
              <span
                key={name}
                className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
              >
                {name} <span className="opacity-60">· {n}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Box</th>
              <th className="px-4 py-3">Prepper</th>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prepped at</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const parsed = parseTitle(b.title);
              const op = b.workerProfile
                ? `${b.workerProfile.firstName} ${b.workerProfile.lastName}`.trim()
                : null;
              const at = b.completedAt ?? b.dueDate ?? null;
              return (
                <tr key={b.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-3 font-mono text-xs">{parsed.batch ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{parsed.box ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{op ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {b.location ? (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        {b.location.locationCode}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      b.status === "COMPLETED"
                        ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                        : b.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                    }`}>
                      {b.status.replace("_", " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {at ? new Date(at).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No batches yet for this warehouse.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: "amber" | "green" | "blue" | "violet";
}) {
  const tintClasses: Record<typeof tint, string> = {
    amber: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
    green: "border-green-200 bg-green-50/70 text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200",
    blue: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
    violet: "border-violet-200 bg-violet-50/70 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${tintClasses[tint]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
