import Link from "next/link";
import { listPurchaseOrdersFull } from "@/features/orders/service";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString, serialize } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const scope = await resolveWarehouseScope(pickString(params.warehouseId));
  const warehouseId = scope.id ?? warehouses[0]?.id;

  if (!warehouseId) {
    return <p className="text-sm text-amber-800">No warehouses configured.</p>;
  }

  const purchaseOrders = await listPurchaseOrdersFull(warehouseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Inbound procurement — create and track POs.
          </p>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface"
        method="get"
      >
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId}
            className="mt-1 block w-52 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs font-medium">{po.poNumber}</td>
                <td className="px-4 py-3">{po.supplierName}</td>
                <td className="px-4 py-3">{po.lines.length}</td>
                <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No purchase orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
