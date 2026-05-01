import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { listOrders } from "@/features/orders/service";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  // Honour the URL ?warehouseId= for admins; operators are pinned to
  // their selected warehouse regardless of the URL.
  const scope = await resolveWarehouseScope(pickString(params.warehouseId));
  const warehouseId = scope.id ?? warehouses[0]?.id;
  const statusRaw = pickString(params.status);
  const status =
    statusRaw && Object.values(OrderStatus).includes(statusRaw as OrderStatus)
      ? (statusRaw as OrderStatus)
      : undefined;

  if (!warehouseId) {
    return <p className="text-sm text-amber-800 dark:text-amber-400">No warehouses configured.</p>;
  }

  const orders = await listOrders(warehouseId, status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            Sales Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Outbound order fulfillment queue.
          </p>
        </div>
        <Link
          href={`/orders/new?warehouseId=${warehouseId}`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500"
        >
          New Order
        </Link>
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
        <label className="text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            <option value="">All</option>
            {Object.values(OrderStatus).map((s) => (
              <option key={s} value={s}>{s}</option>
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
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Ship By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3">{o.customerName}</td>
                <td className="px-4 py-3">{o.lines.length}</td>
                <td className="px-4 py-3">{o.priority}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {o.requestedShipDate ? new Date(o.requestedShipDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/orders/${o.id}`} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
