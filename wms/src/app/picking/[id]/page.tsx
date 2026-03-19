import Link from "next/link";
import { notFound } from "next/navigation";
import { getPickList } from "@/features/logistics/service";

export default async function PickListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPickList(id);
  if (!pl) notFound();

  return (
    <div className="space-y-6 p-6">
      <Link href="/picking" className="text-sm text-blue-700 hover:underline">
        ← Pick lists
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{pl.pickListNumber}</h1>
        <p className="text-sm text-gray-500">
          {pl.warehouse.code} · {pl.status} · Shipment {pl.shipment?.shipmentNumber ?? "—"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Picked</th>
            </tr>
          </thead>
          <tbody>
            {pl.lines.map((ln) => (
              <tr key={ln.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3 text-xs">
                  {ln.fromLocation?.locationCode ?? "—"}
                </td>
                <td className="px-4 py-3">{ln.requestedQty}</td>
                <td className="px-4 py-3">{ln.pickedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pl.shipmentId ? (
        <Link
          href={`/shipping/${pl.shipmentId}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Open shipment workflow →
        </Link>
      ) : null}
    </div>
  );
}
