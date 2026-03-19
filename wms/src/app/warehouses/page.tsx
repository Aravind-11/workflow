import Link from "next/link";
import DirectoryFilters from "@/features/warehouses/components/directory-filters";
import { warehouseFilterSchema } from "@/features/warehouses/schemas";
import { listWarehouses } from "@/features/warehouses/service";
import { statusBadge } from "@/lib/utils";

function formatTime(time: string) {
  return `${time} local`;
}

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = warehouseFilterSchema.parse({
    country: typeof params.country === "string" ? params.country : "",
    state: typeof params.state === "string" ? params.state : "",
    region: typeof params.region === "string" ? params.region : "",
    city: typeof params.city === "string" ? params.city : "",
    search: typeof params.search === "string" ? params.search : "",
  });
  const view = params.view === "list" ? "list" : "grid";

  const data = await listWarehouses(parsed);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Warehouse Directory</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse facilities by geography and operational profile.
        </p>
      </div>

      <DirectoryFilters
        facets={data.facets}
        initialValues={{
          country: parsed.country,
          state: parsed.state,
          region: parsed.region,
          city: parsed.city,
          search: parsed.search,
          view,
        }}
      />

      <WarehouseResults warehouses={data.warehouses} view={view} />
    </div>
  );
}

function WarehouseResults({ warehouses, view }: { warehouses: Awaited<ReturnType<typeof listWarehouses>>["warehouses"]; view: string }) {
  if (warehouses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        No warehouses match the selected filters.
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/warehouses/${warehouse.id}`} className="font-medium text-blue-700 hover:underline">
                    {warehouse.name}
                  </Link>
                  <p className="font-mono text-xs text-gray-500">{warehouse.code}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {warehouse.city}, {warehouse.state}, {warehouse.country}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatTime(warehouse.openTime)} - {formatTime(warehouse.closeTime)}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {warehouse.capacitySqft ? `${warehouse.capacitySqft.toLocaleString()} sq ft` : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(warehouse.status)}`}>
                    {warehouse.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {warehouses.map((warehouse) => (
        <Link
          key={warehouse.id}
          href={`/warehouses/${warehouse.id}`}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{warehouse.name}</h2>
              <p className="font-mono text-xs text-gray-500">{warehouse.code}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(warehouse.status)}`}>
              {warehouse.status}
            </span>
          </div>

          <dl className="space-y-1 text-sm text-gray-600">
            <div>
              <dt className="inline font-medium text-gray-800">Location: </dt>
              <dd className="inline">
                {warehouse.city}, {warehouse.state}, {warehouse.country}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-800">Timezone: </dt>
              <dd className="inline">{warehouse.timezone}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-800">Hours: </dt>
              <dd className="inline">
                {warehouse.openTime} - {warehouse.closeTime}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-800">Capacity: </dt>
              <dd className="inline">
                {warehouse.capacitySqft ? `${warehouse.capacitySqft.toLocaleString()} sq ft` : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-800">Utilization: </dt>
              <dd className="inline">
                {warehouse.utilizationPercent != null ? `${warehouse.utilizationPercent}%` : "Unavailable"}
              </dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
