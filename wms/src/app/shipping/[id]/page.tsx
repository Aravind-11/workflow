import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { ShipmentOps } from "@/components/logistics/shipment-ops";
import { StatusBadge } from "@/components/ui/status-badge";
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
    <div className="space-y-6 p-6">
      <Link href="/shipping" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Shipments
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{s.shipmentNumber}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {s.warehouse.code} · {s.salesOrderRef ?? "No SO ref"}
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {/* Shipment metadata */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:grid-cols-4 dark:border-navy-border dark:bg-navy-surface">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Carrier</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{s.carrier ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Service</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{s.serviceLevel ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Tracking #</p>
          <p className="mt-0.5 font-mono text-xs text-gray-900 dark:text-gray-100">{s.trackingNumber ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Planned ship</p>
          <p className="mt-0.5 text-gray-900 dark:text-gray-100">
            {s.plannedShipAt
              ? new Date(s.plannedShipAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—"}
          </p>
        </div>
      </div>

      {/* Shipment lines table */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-navy-border">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Shipment lines <span className="ml-1 text-xs font-normal text-gray-400">({s.shipmentLines.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">SKU / Item</th>
                <th className="px-4 py-2">CUSTBOX / Lot</th>
                <th className="px-4 py-2">Pallet / Batch</th>
                <th className="px-4 py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {s.shipmentLines.map((ln, idx) => (
                <tr key={ln.id} className="border-t border-gray-100 dark:border-navy-border">
                  <td className="px-4 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                      {ln.inventoryItem.skuCode}
                    </span>
                    {ln.inventoryItem.name !== ln.inventoryItem.skuCode && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ln.inventoryItem.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {ln.lotNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {ln.batchNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{ln.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
