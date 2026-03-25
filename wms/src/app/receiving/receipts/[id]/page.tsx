import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <Link href="/receiving" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
        ← Receiving
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{receipt.receiptNumber}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {receipt.warehouse.code} · {receipt.status.replace("_", " ")}
          </p>
        </div>
        {receipt.status !== ReceiptStatus.POSTED ? (
          <form action={post}>
            <Button type="submit">Post receipt</Button>
          </form>
        ) : null}
      </div>
      {receipt.notes ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-300">{receipt.notes}</p>
      ) : null}
      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-navy dark:text-gray-400">
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
              <tr key={ln.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3">{ln.receivedQty}</td>
                <td className="px-4 py-3">{ln.condition}</td>
                <td className="px-4 py-3">{ln.inboundStatus.replace("_", " ")}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {ln.lotNumber ?? "—"} / {ln.batchNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
