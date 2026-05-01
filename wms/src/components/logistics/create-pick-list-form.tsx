"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPickListAction } from "@/features/logistics/actions";

type ShipmentOption = {
  id: string;
  shipmentNumber: string;
  status: string;
  lineCount: number;
};

export function CreatePickListForm({
  warehouseId,
  shipments,
}: {
  warehouseId: string;
  shipments: ShipmentOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(shipments[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function createPick(shipmentId: string) {
    if (!shipmentId) return;
    setSelectedId(shipmentId);
    setPending(true);
    setErr(null);
    setOk(null);
    const r = await createPickListAction({
      warehouseId,
      shipmentId,
      scheduledDate: new Date(scheduledDate).toISOString(),
      assignedWorkerId: null,
    });
    setPending(false);

    if (!r.ok) {
      setErr(r.error);
      return;
    }

    setOk("Scan list created.");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-border dark:bg-navy-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Create scan list</h3>
        {shipments.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Scheduled date
            <input
              type="date"
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </label>
        )}
      </div>

      {shipments.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          No eligible shipments found (needs shipment lines and no existing pick list).
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {shipments.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-navy-border dark:bg-navy"
            >
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.shipmentNumber}</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{s.status} · {s.lineCount} lines</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => createPick(s.id)}
                disabled={pending && selectedId === s.id}
              >
                {pending && selectedId === s.id ? "Creating..." : "Generate scan list"}
              </Button>
            </div>
          ))}
          {ok ? <p className="text-xs text-green-700 dark:text-green-400">{ok}</p> : null}
          {err ? <p className="text-xs text-red-700 dark:text-red-400">{err}</p> : null}
        </div>
      )}
    </div>
  );
}
