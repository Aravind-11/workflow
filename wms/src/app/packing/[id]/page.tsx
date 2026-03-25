import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { getPackList } from "@/features/logistics/service";

export default async function PackListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPackList(id);
  if (!pl) notFound();

  return (
    <div className="space-y-6 p-6">
      <Link href="/packing" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Pack lists
      </Link>
      <div>
        <h1 className="text-2xl font-semibold dark:text-gray-100">{pl.packListNumber}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {pl.warehouse.code} · {pl.status} · {pl.shipment.shipmentNumber}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Packed</th>
            </tr>
          </thead>
          <tbody>
            {pl.lines.map((ln) => (
              <tr key={ln.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3">{ln.packedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AttachmentsSection entityType="PackList" entityId={id} />

      <Link
        href={`/shipping/${pl.shipmentId}`}
        className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
      >
        Open shipment workflow →
      </Link>
    </div>
  );
}
