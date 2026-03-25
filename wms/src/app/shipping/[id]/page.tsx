import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { ShipmentOps } from "@/components/logistics/shipment-ops";
import { getShipment } from "@/features/logistics/service";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getShipment(id);
  if (!s) notFound();

  const payload = JSON.parse(
    JSON.stringify({
      shipmentId: s.id,
      warehouseId: s.warehouseId,
      shipment: {
        status: s.status,
        carrier: s.carrier,
        serviceLevel: s.serviceLevel,
        trackingNumber: s.trackingNumber,
        plannedShipAt: s.plannedShipAt,
      },
      pickLists: s.pickLists.map((p) => ({
        id: p.id,
        pickListNumber: p.pickListNumber,
        status: p.status,
        lines: p.lines.map((ln) => ({
          id: ln.id,
          requestedQty: ln.requestedQty,
          pickedQty: ln.pickedQty,
          inventoryItem: { skuCode: ln.inventoryItem.skuCode },
        })),
      })),
      packLists: s.packLists.map((p) => ({
        id: p.id,
        packListNumber: p.packListNumber,
        status: p.status,
        lines: p.lines.map((ln) => ({
          id: ln.id,
          packedQty: ln.packedQty,
          inventoryItem: { skuCode: ln.inventoryItem.skuCode },
        })),
      })),
    }),
  );

  return (
    <div className="space-y-6">
      <Link href="/shipping" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Shipments
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{s.shipmentNumber}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {s.warehouse.code} · {s.salesOrderRef ?? "No SO ref"}
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-300">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">Shipment lines</h3>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          {s.shipmentLines.map((ln) => (
            <li key={ln.id}>
              {ln.inventoryItem.skuCode} × {ln.quantity}
            </li>
          ))}
        </ul>
      </section>

      <ShipmentOps
        shipmentId={payload.shipmentId}
        warehouseId={payload.warehouseId}
        shipment={payload.shipment}
        pickLists={payload.pickLists}
        packLists={payload.packLists}
      />

      <AttachmentsSection entityType="Shipment" entityId={id} />
    </div>
  );
}
