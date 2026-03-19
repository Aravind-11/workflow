import Link from "next/link";
import { notFound } from "next/navigation";
import { ReturnDetailPanel } from "@/components/returns/return-detail-panel";
import {
  getReturnDetail,
  listLocationsForWarehouse,
  listReturnAuditEntries,
  listSkus,
} from "@/features/returns/service";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getReturnDetail(id);
  if (!detail) notFound();

  const [audit, locations, skus] = await Promise.all([
    listReturnAuditEntries(id),
    listLocationsForWarehouse(detail.warehouseId),
    listSkus(),
  ]);

  const rma = JSON.parse(JSON.stringify(detail));
  const auditJson = JSON.parse(JSON.stringify(audit));
  const locationsJson = JSON.parse(JSON.stringify(locations));
  const skusJson = JSON.parse(JSON.stringify(skus));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/returns" className="font-medium text-blue-700 hover:underline">
          ← Return queue
        </Link>
      </div>
      <ReturnDetailPanel
        key={`${detail.id}-${detail.updatedAt.toISOString()}`}
        rma={rma}
        audit={auditJson}
        locations={locationsJson}
        skus={skusJson}
      />
    </div>
  );
}
