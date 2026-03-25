import Link from "next/link";
import { getWarehouseDetail } from "@/features/warehouses/service";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {children}
    </section>
  );
}

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWarehouseDetail(id);

  if (!detail) {
    return (
      <div className="space-y-3 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Warehouse not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">The requested warehouse ID does not exist.</p>
        <Link href="/warehouses" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
          Back to directory
        </Link>
      </div>
    );
  }

  const { warehouse } = detail;

  return (
    <div className="space-y-5 p-6">
      <header className="rounded-xl border border-gray-200 bg-white p-5 dark:border-navy-border dark:bg-navy-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{warehouse.name}</h1>
            <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">{warehouse.code}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {warehouse.city}, {warehouse.state}, {warehouse.country} {warehouse.zip}
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-500/15 dark:text-green-400">
            {warehouse.status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Overview">
          <dl className="grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Region</dt>
              <dd>{warehouse.region ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Timezone</dt>
              <dd>{warehouse.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Capacity</dt>
              <dd>{warehouse.capacitySqft ? `${warehouse.capacitySqft.toLocaleString()} sq ft` : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Utilization</dt>
              <dd>{warehouse.utilizationPercent != null ? `${warehouse.utilizationPercent}%` : "Unavailable"}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Operational Hours">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {warehouse.openTime} - {warehouse.closeTime} ({warehouse.timezone})
          </p>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Section title="Inventory Summary">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">On Hand</th>
                  <th className="pb-2">Reserved</th>
                  <th className="pb-2">Lot</th>
                </tr>
              </thead>
              <tbody>
                {detail.inventorySummary.map((row) => (
                  <tr key={`${row.skuCode}-${row.lotNumber}`} className="border-t border-gray-100 dark:border-navy-border">
                    <td className="py-2">
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.skuCode}</p>
                      <p>{row.skuName}</p>
                    </td>
                    <td className="py-2">{row.onHandQty}</td>
                    <td className="py-2">{row.reservedQty}</td>
                    <td className="py-2">{row.lotNumber ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Worker Schedule">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="pb-2">Worker</th>
                  <th className="pb-2">Shift</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.workerSchedule.map((row) => (
                  <tr key={`${row.workerName}-${row.scheduleDate}-${row.shiftName}`} className="border-t border-gray-100 dark:border-navy-border">
                    <td className="py-2">{row.workerName}</td>
                    <td className="py-2">{row.shiftName}</td>
                    <td className="py-2">{new Date(row.scheduleDate).toLocaleDateString()}</td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Deliveries">
          <div className="space-y-2">
            {detail.deliveries.map((row) => (
              <div key={row.deliveryNumber} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-navy-border">
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.deliveryNumber}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {row.direction} - {row.carrier} - {row.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.scheduledAt)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Receipts">
          <div className="space-y-2">
            {detail.receipts.map((row) => (
              <div key={row.receiptNumber} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-navy-border">
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.receiptNumber}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {row.status}
                  {row.supplierName ? ` - ${row.supplierName}` : ""}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.receivedAt)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Returns">
          <div className="space-y-2">
            {detail.returns.map((row) => (
              <div key={row.rmaNumber} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-navy-border">
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.rmaNumber}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {row.customerName} - {row.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.receivedAt)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Open Tasks">
          <div className="space-y-2">
            {detail.openTasks.map((row, index) => (
              <div key={`${row.title}-${index}`} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-navy-border">
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {row.taskType} - {row.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due {formatDateTime(row.dueDate)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Dock Appointments">
          <div className="space-y-2">
            {detail.dockAppointments.map((row) => (
              <div key={row.appointmentCode} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-navy-border">
                <p className="font-medium text-gray-900 dark:text-gray-100">{row.appointmentCode}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {row.carrier} - Door {row.dockDoor} - {row.status}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(row.scheduledStart)} to {formatDateTime(row.scheduledEnd)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
