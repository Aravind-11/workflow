import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { PackListDetail } from "@/components/logistics/pack-list-detail";
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

      <PackListDetail
        packListId={pl.id}
        packListNumber={pl.packListNumber}
        warehouseCode={pl.warehouse.code}
        shipmentNumber={pl.shipment.shipmentNumber}
        shipmentId={pl.shipmentId}
        status={pl.status}
        lines={pl.lines.map((ln) => ({
          id: ln.id,
          inventoryItem: { skuCode: ln.inventoryItem.skuCode, name: ln.inventoryItem.name },
          packedQty: ln.packedQty,
          lotNumber: ln.lotNumber ?? null,
          batchNumber: ln.batchNumber ?? null,
        }))}
        shipmentLines={pl.shipment.shipmentLines.map((sl) => ({
          inventoryItemId: sl.inventoryItemId,
          quantity: sl.quantity,
        }))}
      />

      <AttachmentsSection entityType="PackList" entityId={id} />
    </div>
  );
}
