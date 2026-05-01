import Link from "next/link";
import { ShipmentStatus } from "@prisma/client";
import { CreatePackListForm } from "@/components/logistics/create-pack-list-form";
import { WarehouseSelector } from "@/components/logistics/warehouse-selector";
import { StatusBadge } from "@/components/ui/status-badge";
import { listPackLists, listShipments, listWarehousesForSelect } from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString } from "@/lib/utils";

export default async function PackingListPage({
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
  const [lists, shipments] = await Promise.all([listPackLists(warehouseId), listShipments(warehouseId)]);

  const eligibleShipments = shipments
    .filter(
      (s) =>
        s.shipmentLines.length > 0 &&
        s.packLists.length === 0 &&
        s.status === ShipmentStatus.PICKED,
    )
    .map((s) => ({
      id: s.id,
      shipmentNumber: s.shipmentNumber,
      status: s.status,
      lineCount: s.shipmentLines.length,
    }));

  const total = lists.length;
  const rescan = lists.filter((p) => p.lines[0]?.lotNumber === "RESCAN").length;
  const ok = lists.filter((p) => p.lines[0]?.lotNumber === "OK").length;
  const rescanRate = total > 0 ? ((rescan / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <WarehouseSelector warehouses={warehouses} currentId={warehouseId} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total QC checks" value={total.toLocaleString()} tint="violet" />
        <SummaryCard label="Pass (OK)" value={ok.toLocaleString()} tint="green" />
        <SummaryCard label="Rescan flagged" value={rescan.toLocaleString()} tint="red" />
        <SummaryCard label="Rescan rate" value={`${rescanRate}%`} tint="amber" />
      </section>

      <CreatePackListForm warehouseId={warehouseId} shipments={eligibleShipments} />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">QC #</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Box</th>
              <th className="px-4 py-3">QC operator</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Packed at</th>
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
              const result = line?.lotNumber ?? null;
              const op = p.assignedWorker
                ? `${p.assignedWorker.firstName} ${p.assignedWorker.lastName}`.trim()
                : null;

              return (
                <tr key={p.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-3 font-mono text-xs">{p.packListNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs">{batch ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{boxId}</td>
                  <td className="px-4 py-3 text-xs">{op ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-xs">
                    {result === "RESCAN" ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-500/15 dark:text-red-300">
                        RESCAN
                      </span>
                    ) : result === "OK" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                        OK
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.packedAt ? new Date(p.packedAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/packing/${p.id}`} className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {lists.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No pack lists yet.
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
  tint: "violet" | "green" | "red" | "amber";
}) {
  const tintClasses: Record<typeof tint, string> = {
    violet: "border-violet-200 bg-violet-50/70 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
    green: "border-green-200 bg-green-50/70 text-green-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-200",
    red: "border-red-200 bg-red-50/70 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
    amber: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${tintClasses[tint]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
