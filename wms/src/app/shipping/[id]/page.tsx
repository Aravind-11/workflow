import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentOps } from "@/components/logistics/shipment-ops";
import { FileUpload } from "@/components/ui/file-upload";
import StatusPill from "@/components/ui/StatusPill";
import WorkflowTracker from "@/components/ui/workflow-tracker";
import { getDocuments } from "@/features/documents/service";
import { getShipment } from "@/features/logistics/service";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [s, docs] = await Promise.all([
    getShipment(id),
    getDocuments("shipment", id),
  ]);
  if (!s) notFound();
  const documents = JSON.parse(JSON.stringify(docs));

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
      <Link href="/shipping" className="text-sm text-primary-700 hover:underline">
        ← Shipments
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-neutral-900">{s.shipmentNumber}</h2>
        <StatusPill status={s.status} />
      </div>
      <p className="text-sm text-neutral-500">
        {s.warehouse.code} · {s.salesOrderRef ?? "No SO ref"}
      </p>

      <WorkflowTracker
        steps={["CREATED", "PICKED", "PACKED", "SHIPPED", "DELIVERED"]}
        currentStep={s.status}
      />

      <section className="rounded-xl border border-border bg-neutral-50 p-4 text-sm">
        <h3 className="font-medium text-neutral-800">Shipment lines</h3>
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

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Documents</h3>
        <FileUpload entityType="shipment" entityId={s.id} documents={documents} />
      </section>
    </div>
  );
}
