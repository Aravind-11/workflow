import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AttachmentsSection } from "@/components/attachments/attachments-section";
import { postReceiptAction } from "@/features/logistics/actions";
import { getReceipt } from "@/features/logistics/service";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();

  async function post() {
    "use server";
    await postReceiptAction(id);
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/receiving" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Receiving
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{receipt.receiptNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{receipt.warehouse.code}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={receipt.status} />
          {receipt.status !== ReceiptStatus.POSTED && (
            <form action={post}>
              <Button type="submit">Post receipt</Button>
            </form>
          )}
        </div>
      </div>

      {/* Metadata strip */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:grid-cols-3 dark:border-navy-border dark:bg-navy-surface">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Warehouse</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{receipt.warehouse.code} — {receipt.warehouse.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Received at</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
            {new Date(receipt.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total lines</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{receipt.lines.length}</p>
        </div>
      </div>

      {receipt.notes && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-300">
          {receipt.notes}
        </p>
      )}

      {/* Lines table */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-navy-border">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Receipt lines <span className="ml-1 text-xs font-normal text-gray-400">({receipt.lines.length})</span>
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
                <th className="px-4 py-2">Condition</th>
                <th className="px-4 py-2">Stage</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((ln, idx) => (
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
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{ln.lotNumber ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{ln.batchNumber ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium">{ln.receivedQty}</td>
                  <td className="px-4 py-2 text-xs">{ln.condition}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {ln.inboundStatus.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AttachmentsSection entityType="Receipt" entityId={id} />
    </div>
  );
}
