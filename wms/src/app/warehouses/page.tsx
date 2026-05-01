import Link from "next/link";
import DirectoryFilters from "@/features/warehouses/components/directory-filters";
import { warehouseFilterSchema } from "@/features/warehouses/schemas";
import { listWarehouses } from "@/features/warehouses/service";
import { statusBadge } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageFade } from "@/components/dashboard/scroll-motion";

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
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Network · Directory"
        title="Warehouse directory"
        subtitle="Browse facilities by geography and operational profile."
      />

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

      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {data.warehouses.length} result{data.warehouses.length === 1 ? "" : "s"}
        </p>
      </div>

      <PageFade delay={0.18}>
        <WarehouseResults warehouses={data.warehouses} view={view} />
      </PageFade>
    </div>
  );
}

function WarehouseResults({
  warehouses,
  view,
}: {
  warehouses: Awaited<ReturnType<typeof listWarehouses>>["warehouses"];
  view: string;
}) {
  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-y border-slate-200/60 px-6 py-20 text-center dark:border-white/[0.06]">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          No matches
        </p>
        <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
          No warehouses match the selected filters.
        </p>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-[1] bg-white/80 backdrop-blur dark:bg-navy/80">
            <tr>
              <Th className="text-left">Warehouse</Th>
              <Th className="text-left">Location</Th>
              <Th className="text-left">Hours</Th>
              <Th className="text-right">Capacity</Th>
              <Th className="text-left">Status</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr
                key={w.id}
                className="group transition-colors duration-200 hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
              >
                <Td>
                  <Link
                    href={`/warehouses/${w.id}`}
                    className="block min-w-0"
                  >
                    <span className="block text-[14px] font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-950 dark:text-gray-100 dark:group-hover:text-gray-50">
                      {w.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {w.code}
                    </span>
                  </Link>
                </Td>
                <Td className="text-[13px] text-slate-700 dark:text-slate-300">
                  {w.city}, {w.state}, {w.country}
                </Td>
                <Td className="font-mono text-[12.5px] tabular-nums text-slate-700 dark:text-slate-300">
                  {formatTime(w.openTime)} – {formatTime(w.closeTime)}
                </Td>
                <Td className="text-right font-mono text-[12.5px] tabular-nums text-slate-700 dark:text-slate-300">
                  {w.capacitySqft ? `${w.capacitySqft.toLocaleString()} sq ft` : "—"}
                </Td>
                <Td>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(w.status)}`}
                  >
                    {w.status}
                  </span>
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/warehouses/${w.id}`}
                    aria-label={`Open ${w.name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 group-hover:translate-x-0.5 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                  >
                    →
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-0 border-t border-slate-200/60 md:grid-cols-2 2xl:grid-cols-3 dark:border-white/[0.06]">
      {warehouses.map((w) => (
        <Link
          key={w.id}
          href={`/warehouses/${w.id}`}
          className="group relative block border-b border-slate-200/40 py-5 transition-colors duration-200 hover:bg-slate-50/40 dark:border-white/[0.04] dark:hover:bg-white/[0.02]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-gray-100">
                {w.code}
              </p>
              <h2 className="mt-1.5 text-[15.5px] font-semibold tracking-tight text-slate-900 dark:text-gray-100">
                {w.name}
              </h2>
              <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                {w.city}, {w.state}, {w.country}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(w.status)}`}
            >
              {w.status}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-4">
            <Cell label="Hours" value={`${w.openTime}–${w.closeTime}`} />
            <Cell
              label="Capacity"
              value={
                w.capacitySqft ? `${w.capacitySqft.toLocaleString()} sq ft` : "—"
              }
            />
            <Cell
              label="Util"
              value={w.utilizationPercent != null ? `${w.utilizationPercent}%` : "—"}
            />
          </dl>

          <span
            aria-hidden
            className="absolute right-0 top-5 inline-flex translate-x-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 dark:text-slate-600"
          >
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[12px] tabular-nums text-slate-700 dark:text-slate-300">
        {value}
      </dd>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200/60 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-white/[0.06] dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-200/40 px-3 py-3 align-middle dark:border-white/[0.04] ${className}`}
    >
      {children}
    </td>
  );
}
