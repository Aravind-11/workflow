import Link from "next/link";
import { ShipmentStatus } from "@prisma/client";
import { CreatePickListForm } from "@/components/logistics/create-pick-list-form";
import { ExcelImportButton } from "@/components/logistics/excel-import-button";
import { WarehouseSelector } from "@/components/logistics/warehouse-selector";
import { StatusBadge } from "@/components/ui/status-badge";
import { listPickLists, listShipments, listWarehousesForSelect } from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString } from "@/lib/utils";

export default async function PickingListPage({
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
    return <p className="text-sm text-amber-800 dark:text-amber-400">No warehouses.</p>;
  }
  const [lists, shipments] = await Promise.all([listPickLists(warehouseId), listShipments(warehouseId)]);
  const eligibleShipments = shipments
    .filter((s) => s.shipmentLines.length > 0 && s.pickLists.length === 0 && s.status !== ShipmentStatus.SHIPPED)
    .map((s) => ({
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      status: s.status,
      lineCount: s.shipmentLines.length,
    }));

  // Summary chips
  const totalScans = lists.length;
  const completed = lists.filter((p) => p.status === "COMPLETED").length;
  const inProgress = lists.filter((p) => p.status === "IN_PROGRESS").length;
  const open = lists.filter((p) => p.status === "OPEN").length;
  const machineTally = new Map<string, number>();
  for (const p of lists) {
    const m = p.lines[0]?.lotNumber;
    if (!m) continue;
    machineTally.set(m, (machineTally.get(m) ?? 0) + 1);
  }
  const topMachines = [...machineTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WarehouseSelector warehouses={warehouses} currentId={warehouseId} />
        <ExcelImportButton warehouseId={warehouseId} mode="picking" />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total scans" value={totalScans.toLocaleString()} tint="indigo" />
        <SummaryCard label="Completed" value={completed.toLocaleString()} tint="green" />
        <SummaryCard label="In progress" value={inProgress.toLocaleString()} tint="amber" />
        <SummaryCard label="Open" value={open.toLocaleString()} tint="gray" />
      </section>

      {topMachines.length > 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Top scanners
          </h2>
          <div className="flex flex-wrap gap-2">
            {topMachines.map(([m, n]) => (
              <span
                key={m}
                className="rounded-md bg-indigo-50 px-2 py-1 font-mono text-xs text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                {m} <span className="text-indigo-500/70">· {n}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <CreatePickListForm warehouseId={warehouseId} shipments={eligibleShipments} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Scan #</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Box</th>
              <th className="px-4 py-3">Scanner op</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lists.map((p) => {
              const line = p.lines[0];
              const sku = line?.inventoryItem.skuCode ?? "";
              const boxId = sku.startsWith("MAIL-") ? sku.slice(5) : sku || "—";
              const batch = line?.batchNumber ??
                (p.shipment?.salesOrderRef?.startsWith("LACO-") ? p.shipment.salesOrderRef.slice(5) : null);
              const machine = line?.lotNumber ?? null;
              const op = p.assignedWorker
                ? `${p.assignedWorker.firstName} ${p.assignedWorker.lastName}`.trim()
                : null;

              return (
                <tr key={p.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-3 font-mono text-xs">{p.pickListNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{batch ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{boxId}</td>
                  <td className="px-4 py-3 text-xs">{op ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {machine ? (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[11px] text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {machine}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.startedAt ? new Date(p.startedAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.completedAt ? new Date(p.completedAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/picking/${p.id}`} className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {lists.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No scan lists yet.
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
  tint: "indigo" | "green" | "amber" | "gray";
}) {
  const tintClasses: Record<typeof tint, string> = {
    indigo: "border-indigo-200 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200",
    green: "border-green-200 bg-green-50/70 text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200",
    amber: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
    gray: "border-gray-200 bg-gray-50/70 text-gray-900 dark:border-navy-border dark:bg-navy dark:text-gray-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${tintClasses[tint]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
