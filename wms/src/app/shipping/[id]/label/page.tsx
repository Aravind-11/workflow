import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/logistics/print-button";
import { getShipment } from "@/features/logistics/service";

export default async function ShippingLabelPage({
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

      <div className="mx-auto max-w-md border-2 border-dashed border-gray-400 p-6">
        <div className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
          Shipping label
        </div>
        <div className="mt-4 border-t border-gray-300 pt-4">
          <p className="font-mono text-2xl font-bold">{s.shipmentNumber}</p>
          <p className="mt-2 text-sm text-gray-600">{s.warehouse.name}</p>
          <p className="mt-4 text-lg font-semibold">{s.carrier}</p>
          {s.serviceLevel ? <p className="text-sm text-gray-600">{s.serviceLevel}</p> : null}
          <p className="mt-4 font-mono text-sm">
            TRACKING: {s.trackingNumber ?? "________________"}
          </p>
        </div>
        <div className="mt-6 grid place-items-center border border-gray-200 p-4">
          <div className="h-24 w-48 bg-[repeating-linear-gradient(90deg,#000_0_2px,transparent_2px_4px)] opacity-30" />
          <span className="mt-2 text-[10px] text-gray-400">Barcode placeholder</span>
        </div>
      </div>
    </div>
  );
}
