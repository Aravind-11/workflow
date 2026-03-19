import Link from "next/link";
import { listPackLists, listWarehousesForSelect } from "@/features/logistics/service";
import { pickString } from "@/lib/utils";

export default async function PackingListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const warehouseId = pickString(params.warehouseId) ?? warehouses[0]?.id;
  if (!warehouseId) {
    return <p className="text-sm text-amber-800">No warehouses.</p>;
  }
  const lists = await listPackLists(warehouseId);

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" method="get">
        <label className="text-sm">
          <span className="text-gray-600">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Pack #</th>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lists.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-xs">{p.packListNumber}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.shipment.shipmentNumber}
                </td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/packing/${p.id}`} className="text-blue-700 hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {lists.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No pack lists.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
