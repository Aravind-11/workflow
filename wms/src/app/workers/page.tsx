import Link from "next/link";
import { WorkerStatus } from "@prisma/client";
import { listWarehouseOptions, listWorkers } from "@/features/workers/service";
import { pickString } from "@/lib/utils";

export default async function WorkersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = pickString(params.search);
  const warehouseId = pickString(params.warehouseId);
  const statusRaw = pickString(params.status);
  const status =
    statusRaw && Object.values(WorkerStatus).includes(statusRaw as WorkerStatus)
      ? (statusRaw as WorkerStatus)
      : undefined;

  const [workers, warehouses] = await Promise.all([
    listWorkers({ search, warehouseId, status }),
    listWarehouseOptions(),
  ]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface"
        method="get"
      >
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Name, code, email…"
            className="mt-1 block w-56 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:placeholder-gray-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className="mt-1 block w-52 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            <option value="">All</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            <option value="">All</option>
            {Object.values(WorkerStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {worker.firstName} {worker.lastName}
                  </span>
                  {worker.email ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{worker.email}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{worker.employeeCode}</td>
                <td className="px-4 py-3">
                  {worker.warehouse.code}{" "}
                  <span className="text-gray-500 dark:text-gray-400">· {worker.warehouse.name}</span>
                </td>
                <td className="px-4 py-3">{worker.roleName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      worker.status === WorkerStatus.ACTIVE
                        ? "bg-green-50 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                        : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {worker.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/workers/${worker.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
                  >
                    View profile
                  </Link>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  No workers match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
