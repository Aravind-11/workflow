import { prisma } from "@/server/db/prisma";
import { pickString } from "@/lib/utils";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const warehouseId = pickString(params.warehouseId);
  const entityType = pickString(params.entityType);
  const action = pickString(params.action);
  const page = Math.max(1, parseInt(pickString(params.page) ?? "1"));
  const limit = 50;

  const where: Record<string, unknown> = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          Audit Trail
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Searchable log of all system mutations ({total} entries).
        </p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface"
        method="get"
      >
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            <option value="">All</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Entity Type</span>
          <input
            name="entityType"
            defaultValue={entityType ?? ""}
            placeholder="e.g. TrackingItem"
            className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Action</span>
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="e.g. CREATE"
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          />
        </label>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs">
                  {log.user?.fullName ?? log.user?.email ?? "System"}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={log.action} />
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {log.entityType}
                  {log.entityId && (
                    <span className="ml-1 text-gray-400">#{log.entityId.slice(-6)}</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-xs text-gray-500">
                  {log.newValues
                    ? JSON.stringify(log.newValues).slice(0, 120)
                    : log.oldValues
                    ? JSON.stringify(log.oldValues).slice(0, 120)
                    : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`?page=${page - 1}&warehouseId=${warehouseId ?? ""}&entityType=${entityType ?? ""}&action=${action ?? ""}`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 dark:border-navy-border dark:hover:bg-white/5"
            >
              Previous
            </a>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`?page=${page + 1}&warehouseId=${warehouseId ?? ""}&entityType=${entityType ?? ""}&action=${action ?? ""}`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 dark:border-navy-border dark:hover:bg-white/5"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
