import Link from "next/link";
import { notFound } from "next/navigation";
import ProgressBar from "@/components/ui/progress-bar";
import StatusPill from "@/components/ui/StatusPill";
import WorkflowTracker from "@/components/ui/workflow-tracker";
import { getPickList } from "@/features/logistics/service";

export default async function PickListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pl = await getPickList(id);
  if (!pl) notFound();

  const totalRequested = pl.lines.reduce((sum, ln) => sum + ln.requestedQty, 0);
  const totalPicked = pl.lines.reduce((sum, ln) => sum + ln.pickedQty, 0);

  return (
    <div className="space-y-6 p-6">
      <Link href="/picking" className="text-sm text-primary-700 hover:underline">
        ← Pick lists
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{pl.pickListNumber}</h1>
          <StatusPill status={pl.status} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {pl.warehouse.code} · {pl.status} · Shipment {pl.shipment?.shipmentNumber ?? "—"}
        </p>
      </div>

      <WorkflowTracker
        steps={["OPEN", "IN_PROGRESS", "COMPLETED"]}
        currentStep={pl.status}
      />

      <ProgressBar value={totalPicked} max={totalRequested} label="Units picked" />

      <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Picked</th>
            </tr>
          </thead>
          <tbody>
            {pl.lines.map((ln) => (
              <tr key={ln.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-mono text-xs">{ln.inventoryItem.skuCode}</td>
                <td className="px-4 py-3 text-xs">
                  {ln.fromLocation?.locationCode ?? "—"}
                </td>
                <td className="px-4 py-3">{ln.requestedQty}</td>
                <td className="px-4 py-3">{ln.pickedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pl.shipmentId ? (
        <Link
          href={`/shipping/${pl.shipmentId}`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          Open shipment workflow →
        </Link>
      ) : null}
    </div>
  );
}
