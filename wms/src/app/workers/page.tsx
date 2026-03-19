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
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
        method="get"
      >
        <label className="text-sm">
          <span className="text-gray-600">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Name, code, email…"
            className="mt-1 block w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-600">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className="mt-1 block w-52 rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          <span className="text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
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
              <tr key={worker.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">
                    {worker.firstName} {worker.lastName}
                  </span>
                  {worker.email ? (
                    <div className="text-xs text-gray-500">{worker.email}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{worker.employeeCode}</td>
                <td className="px-4 py-3">
                  {worker.warehouse.code}{" "}
                  <span className="text-gray-500">· {worker.warehouse.name}</span>
                </td>
                <td className="px-4 py-3">{worker.roleName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      worker.status === WorkerStatus.ACTIVE
                        ? "bg-green-50 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {worker.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/workers/${worker.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    View profile
                  </Link>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
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
