import Link from "next/link";
import { notFound } from "next/navigation";
import ProgressBar from "@/components/ui/progress-bar";
import StatusPill from "@/components/ui/StatusPill";
import WorkflowTracker from "@/components/ui/workflow-tracker";
import { getPackList } from "@/features/logistics/service";

export default async function PackListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPackList(id);
  if (!pl) notFound();

  const totalPacked = pl.lines.reduce(
    (sum: number, ln: { packedQty: number }) => sum + ln.packedQty,
    0,
  );
  const totalToPack = pl.shipment.pickLists
    .flatMap((pk: { lines: { requestedQty: number }[] }) => pk.lines)
    .reduce(
      (sum: number, ln: { requestedQty: number }) => sum + ln.requestedQty,
      0,
    );

  return (
    <div className="space-y-6 p-6">
      <Link href="/packing" className="text-sm text-primary-700 hover:underline">
        ← Pack lists
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{pl.packListNumber}</h1>
          <StatusPill status={pl.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {pl.warehouse.code} · {pl.status} · {pl.shipment.shipmentNumber}
        </p>
      </div>

      <WorkflowTracker
        steps={["OPEN", "IN_PROGRESS", "COMPLETED"]}
        currentStep={pl.status}
      />

      <ProgressBar value={totalPacked} max={totalToPack || 1} label="Units packed" />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Packed</th>
            </tr>
          </thead>
          <tbody>
            {pl.lines.map((ln: { id: string; inventoryItem: { skuCode: string }; packedQty: number }) => (
              <tr key={ln.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3">{ln.packedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={`/shipping/${pl.shipmentId}`}
        className="text-sm font-medium text-primary-700 hover:underline"
      >
        Open shipment workflow →
      </Link>
    </div>
  );
}
