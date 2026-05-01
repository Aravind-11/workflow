import { listTransfers } from "@/features/transfers/actions";
import { getSelectedWarehouseId } from "@/lib/warehouse-context";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const warehouseId = await getSelectedWarehouseId();
  const transfers = await listTransfers(warehouseId ?? undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            Warehouse Transfers
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Move inventory between warehouses with full tracking.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Transfer #</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs font-medium">{t.transferNumber}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.fromWarehouseId.slice(-6)}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.toWarehouseId.slice(-6)}</td>
                <td className="px-4 py-3">{t.lines.length}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/transfers/${t.id}`} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No transfers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
