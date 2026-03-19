import Link from "next/link";
import { ReturnStatus } from "@prisma/client";
import { CreateRmaModal } from "@/components/returns/create-rma-modal";
import { listRecentShipmentsForRma, listReturnQueue, listWarehousesSelect } from "@/features/returns/service";
import { pickString, serialize } from "@/lib/utils";

export default async function ReturnsQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouseId = pickString(params.warehouseId);
  const statusRaw = pickString(params.status);
  const search = pickString(params.search);
  const status =
    statusRaw && Object.values(ReturnStatus).includes(statusRaw as ReturnStatus)
      ? (statusRaw as ReturnStatus)
      : undefined;

  const [warehouses, rows, shipments] = await Promise.all([
    listWarehousesSelect(),
    listReturnQueue({
      warehouseId,
      status,
      search,
    }),
    listRecentShipmentsForRma(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <section className="max-w-3xl flex-1 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
          <p className="font-semibold">Exception workflow</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Create RMA (link shipment/order, reason code).</li>
            <li>Authorize → receive physically → QC per line.</li>
            <li>
              Set disposition; <strong>restock / refurbish / quarantine</strong> posts inventory.
            </li>
          </ol>
        </section>
        <CreateRmaModal
          warehouses={warehouses}
          shipments={serialize(shipments)}
        />
      </div>

      <form
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
        method="get"
      >
        <label className="min-w-0 flex-1 text-sm sm:max-w-xs">
          <span className="text-gray-600">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className="mt-1 block w-full min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm sm:w-44">
          <span className="text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className="mt-1 block w-full min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.values(ReturnStatus).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-sm sm:max-w-sm">
          <span className="text-gray-600">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="RMA, customer, order…"
            className="mt-1 block w-full min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-10 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">RMA</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">WH</th>
              <th className="px-4 py-3">Exception</th>
              <th className="px-4 py-3">Shipment / order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((rma) => (
              <tr key={rma.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-mono text-xs font-medium">{rma.rmaNumber}</td>
                <td className="px-4 py-3">{rma.customerName}</td>
                <td className="px-4 py-3 text-xs">{rma.warehouse.code}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {rma.exceptionReasonCode ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {rma.shipment ? (
                    <span className="font-mono">{rma.shipment.shipmentNumber}</span>
                  ) : null}
                  {rma.originalOrderRef ? (
                    <div className="text-gray-500">SO {rma.originalOrderRef}</div>
                  ) : null}
                  {!rma.shipment && !rma.originalOrderRef ? "—" : null}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {rma.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">{rma.lines.length}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/returns/${rma.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  No returns in queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
