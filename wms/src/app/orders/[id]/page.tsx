import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/features/orders/service";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return notFound();

  return (
    <div className="space-y-6">
      <Link href="/orders" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Orders
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {order.orderNumber}
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customer: {order.customerName} · Warehouse: {order.warehouse.code}
          {order.requestedShipDate && (
            <> · Ship by: {new Date(order.requestedShipDate).toLocaleDateString()}</>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-navy-border">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Order Lines ({order.lines.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Ordered</th>
              <th className="px-4 py-2">Shipped</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-2 font-mono text-xs">{line.inventoryItem.skuCode}</td>
                <td className="px-4 py-2">{line.inventoryItem.name}</td>
                <td className="px-4 py-2">{line.qtyOrdered}</td>
                <td className="px-4 py-2">{line.qtyShipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
