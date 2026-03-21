import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import ProgressBar from "@/components/ui/progress-bar";
import StatusPill from "@/components/ui/StatusPill";
import WorkflowTracker from "@/components/ui/workflow-tracker";
import { getDocuments } from "@/features/documents/service";
import { postReceiptAction } from "@/features/logistics/actions";
import { getReceipt } from "@/features/logistics/service";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receipt, docs] = await Promise.all([
    getReceipt(id),
    getDocuments("receipt", id),
  ]);
  if (!receipt) notFound();
  const documents = JSON.parse(JSON.stringify(docs));

  async function post() {
    "use server";
    await postReceiptAction(id);
  }

  const inspectedCount = receipt.lines.filter((ln) => ln.inboundStatus !== "PENDING").length;
  const putawayCount = receipt.lines.filter((ln) => ln.inboundStatus === "PUTAWAY_COMPLETE").length;

  return (
    <div className="space-y-6">
      <Link href="/receiving" className="text-sm text-primary-700 hover:underline">
        ← Receiving
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">{receipt.receiptNumber}</h1>
            <StatusPill status={receipt.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {receipt.warehouse.code} · {receipt.status.replace("_", " ")}
          </p>
        </div>
        {receipt.status !== ReceiptStatus.POSTED ? (
          <form action={post}>
            <Button type="submit">Post receipt</Button>
          </form>
        ) : null}
      </div>

      <WorkflowTracker
        steps={["DRAFT", "RECEIVED", "POSTED"]}
        currentStep={receipt.status}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressBar value={inspectedCount} max={receipt.lines.length} label="Lines inspected" />
        <ProgressBar value={putawayCount} max={receipt.lines.length} label="Lines put away" />
      </div>

      {receipt.notes ? (
        <p className="rounded-lg border border-border bg-neutral-50 p-3 text-sm">{receipt.notes}</p>
      ) : null}
      <section className="overflow-x-auto rounded-xl border border-border bg-surface-raised shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Inbound stage</th>
              <th className="px-4 py-3">Lot / batch</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((ln) => (
              <tr key={ln.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3">{ln.receivedQty}</td>
                <td className="px-4 py-3">{ln.condition}</td>
                <td className="px-4 py-3">{ln.inboundStatus.replace("_", " ")}</td>
                <td className="px-4 py-3 text-xs text-neutral-600">
                  {ln.lotNumber ?? "—"} / {ln.batchNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Documents</h3>
        <FileUpload entityType="receipt" entityId={receipt.id} documents={documents} />
      </section>
    </div>
  );
}
