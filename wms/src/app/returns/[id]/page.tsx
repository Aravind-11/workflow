import Link from "next/link";
import { notFound } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import { ReturnDetailPanel } from "@/components/returns/return-detail-panel";
import { getDocuments } from "@/features/documents/service";
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

  const [audit, locations, skus, docs] = await Promise.all([
    listReturnAuditEntries(id),
    listLocationsForWarehouse(detail.warehouseId),
    listSkus(),
    getDocuments("return", id),
  ]);

  const rma = JSON.parse(JSON.stringify(detail));
  const auditJson = JSON.parse(JSON.stringify(audit));
  const locationsJson = JSON.parse(JSON.stringify(locations));
  const skusJson = JSON.parse(JSON.stringify(skus));
  const documents = JSON.parse(JSON.stringify(docs));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/returns" className="font-medium text-primary-700 hover:underline">
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
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Attachments</h3>
        <FileUpload entityType="return" entityId={detail.id} documents={documents} />
      </section>
    </div>
  );
}
