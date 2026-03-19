import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/logistics/print-button";
import { getShipment } from "@/features/logistics/service";

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getShipment(id);
  if (!s) notFound();

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <style>{`@media print { .no-print { display: none; } }`}</style>
      <div className="no-print mb-6 flex gap-3">
        <Link href={`/shipping/${id}`} className="text-sm text-blue-700 hover:underline">
          ← Shipment
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-2xl border border-gray-300 p-8">
        <div className="flex justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-bold">Packing slip</h1>
            <p className="text-sm text-gray-600">{s.warehouse.name}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold">{s.shipmentNumber}</p>
            {s.salesOrderRef ? <p>SO {s.salesOrderRef}</p> : null}
          </div>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2">SKU</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Lot / batch</th>
            </tr>
          </thead>
          <tbody>
            {s.shipmentLines.map((ln) => (
              <tr key={ln.id} className="border-b border-gray-100">
                <td className="py-2 font-mono">{ln.inventoryItem.skuCode}</td>
                <td className="py-2">{ln.quantity}</td>
                <td className="py-2 text-xs text-gray-600">
                  {ln.lotNumber ?? "—"} / {ln.batchNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-xs text-gray-400">
          Ship via {s.carrier}
          {s.serviceLevel ? ` (${s.serviceLevel})` : ""} · Tracking: {s.trackingNumber ?? "—"}
        </p>
      </div>
    </div>
  );
}
