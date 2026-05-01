import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WorkerStatus } from "@prisma/client";
import { ExcelUpload } from "@/components/workers/excel-upload";
import {
  FilterBar,
  FilterField,
  PageHeader,
  filterControlClass,
} from "@/components/dashboard/page-header";
import { PageFade } from "@/components/dashboard/scroll-motion";
import { listWarehouseOptions, listWorkers } from "@/features/workers/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString } from "@/lib/utils";

export default async function WorkersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = pickString(params.search);
  // Operator mode forces the warehouse filter to the user's active site;
  // admin mode honours `?warehouseId=` (or "all" if blank).
  const scope = await resolveWarehouseScope(pickString(params.warehouseId));
  const warehouseId = scope.locked ? scope.id ?? undefined : scope.requestedId ?? undefined;
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
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Workers"
        subtitle="Everyone on the floor across the network. Filter by warehouse or status to focus a team."
      />

      <FilterBar>
        <FilterField label="Search">
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Name, code, email…"
            className={`${filterControlClass} w-56`}
          />
        </FilterField>
        <FilterField label="Warehouse">
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className={`${filterControlClass} w-52`}
          >
            <option value="">All</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className={`${filterControlClass} w-40`}
          >
            <option value="">All</option>
            {Object.values(WorkerStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </FilterField>
        <button
          type="submit"
          className="ml-auto inline-flex h-9 items-center rounded-md bg-slate-900 px-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-white transition-transform duration-200 hover:-translate-y-0.5 dark:bg-white dark:text-slate-900"
        >
          Apply
        </button>
      </FilterBar>

      {warehouseId && <ExcelUpload warehouseId={warehouseId} type="workers" />}

      <PageFade delay={0.18}>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-[1] bg-white/80 backdrop-blur dark:bg-navy/80">
              <tr>
                <Th className="text-left">Employee</Th>
                <Th className="text-left">Code</Th>
                <Th className="text-left">Warehouse</Th>
                <Th className="text-left">Role</Th>
                <Th className="text-left">Status</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-16 text-center text-[13px] text-slate-500 dark:text-slate-400"
                  >
                    No workers match your filters.
                  </td>
                </tr>
              )}
              {workers.map((worker) => (
                <tr
                  key={worker.id}
                  className="group transition-colors duration-200 hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                >
                  <Td>
                    <Link
                      href={`/workers/${worker.id}`}
                      className="block min-w-0"
                    >
                      <span className="block text-[14px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-950 dark:text-gray-100 dark:group-hover:text-gray-50">
                        {worker.firstName} {worker.lastName}
                      </span>
                      {worker.email ? (
                        <span className="mt-0.5 block text-[11.5px] text-slate-500 dark:text-slate-400">
                          {worker.email}
                        </span>
                      ) : null}
                    </Link>
                  </Td>
                  <Td className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-slate-700 dark:text-slate-300">
                    {worker.employeeCode}
                  </Td>
                  <Td className="text-[13px] text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {worker.warehouse.code}
                    </span>
                    <span className="ml-1.5 text-slate-500 dark:text-slate-400">
                      · {worker.warehouse.name}
                    </span>
                  </Td>
                  <Td className="text-[13px] text-slate-700 dark:text-slate-300">
                    {worker.roleName ?? "—"}
                  </Td>
                  <Td>
                    <StatusPill status={worker.status} />
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/workers/${worker.id}`}
                      aria-label={`Open ${worker.firstName} ${worker.lastName}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 group-hover:translate-x-0.5 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageFade>
    </div>
  );
}

function StatusPill({ status }: { status: WorkerStatus }) {
  const isActive = status === WorkerStatus.ACTIVE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] ${
        isActive
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          isActive
            ? "bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129_/_0.18)]"
            : "bg-slate-400"
        }`}
      />
      {status.replace("_", " ")}
    </span>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200/60 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-white/[0.06] dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-200/40 px-3 py-3 align-middle dark:border-white/[0.04] ${className}`}
    >
      {children}
    </td>
  );
}
