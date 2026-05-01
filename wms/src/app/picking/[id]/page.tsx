import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { PickListDetail } from "@/components/logistics/pick-list-detail";
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
      <Link href="/picking" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Scanning
      </Link>

      <PickListDetail
        pickListId={pl.id}
        pickListNumber={pl.pickListNumber}
        warehouseCode={pl.warehouse.code}
        shipmentNumber={pl.shipment?.shipmentNumber ?? null}
        shipmentId={pl.shipmentId}
        status={pl.status}
        lines={pl.lines.map((ln) => ({
          id: ln.id,
          inventoryItem: { skuCode: ln.inventoryItem.skuCode, name: ln.inventoryItem.name },
          fromLocation: ln.fromLocation ? { locationCode: ln.fromLocation.locationCode } : null,
          requestedQty: ln.requestedQty,
          pickedQty: ln.pickedQty,
          lotNumber: ln.lotNumber ?? null,
          batchNumber: ln.batchNumber ?? null,
        }))}
      />

      <AttachmentsSection entityType="PickList" entityId={id} />
    </div>
  );
}
