import { endOfWeek, format, startOfWeek } from "date-fns";
import {
  FilterBar,
  FilterField,
  PageHeader,
  filterControlClass,
} from "@/components/dashboard/page-header";
import { PageFade } from "@/components/dashboard/scroll-motion";
import { ExcelUpload } from "@/components/workers/excel-upload";
import { WeeklyScheduleBoard } from "@/components/workers/weekly-schedule-board";
import {
  listLocationsForWarehouse,
  listSchedulesForWeek,
  listShiftsForWarehouse,
  listWarehouseOptions,
  listWorkersForWarehouse,
} from "@/features/workers/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString, serialize } from "@/lib/utils";

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehouseOptions();
  // Operator mode pins the warehouse — URL ?warehouseId= can't override it.
  const scope = await resolveWarehouseScope(pickString(params.warehouseId));
  const warehouseId = scope.id ?? warehouses[0]?.id;
  const weekRaw = pickString(params.week);
  const weekStart = weekRaw
    ? startOfWeek(new Date(weekRaw), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  if (!warehouseId) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader
          title="Weekly schedules"
          subtitle="Lay out shifts and coverage by location, day, and worker."
        />
        <div className="flex items-center gap-3 border-y border-amber-200/60 px-4 py-4 text-[13px] text-amber-900 dark:border-amber-500/20 dark:text-amber-300">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgb(251_191_36_/_0.18)]"
          />
          No warehouses found. Seed the database to use scheduling.
        </div>
      </div>
    );
  }

  const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
  const we = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartStr = format(ws, "yyyy-MM-dd");
  const weekEndStr = format(we, "yyyy-MM-dd");

  const [weekData, shifts, workers, locations] = await Promise.all([
    listSchedulesForWeek({ warehouseId, weekStart }),
    listShiftsForWarehouse(warehouseId),
    listWorkersForWarehouse(warehouseId),
    listLocationsForWarehouse(warehouseId),
  ]);

  const serialized = serialize({ weekData, shifts, workers, locations });

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Weekly schedules"
        subtitle={`Week of ${format(ws, "MMM d, yyyy")} — drag shifts to assign coverage by location and day.`}
      />

      <FilterBar>
        <FilterField label="Warehouse">
          <select
            name="warehouseId"
            defaultValue={warehouseId}
            className={`${filterControlClass} w-64`}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Week starting">
          <input
            type="date"
            name="week"
            defaultValue={weekStartStr}
            className={`${filterControlClass} w-44`}
          />
        </FilterField>
        <button
          type="submit"
          className="ml-auto inline-flex h-9 items-center rounded-md bg-slate-900 px-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-white transition-transform duration-200 hover:-translate-y-0.5 dark:bg-white dark:text-slate-900"
        >
          Apply
        </button>
      </FilterBar>

      <ExcelUpload warehouseId={warehouseId} type="schedules" />

      <PageFade delay={0.18}>
        <WeeklyScheduleBoard
          warehouseId={warehouseId}
          weekStartIso={weekStartStr}
          weekEndIso={weekEndStr}
          schedules={serialized.weekData.schedules}
          shifts={serialized.shifts}
          workers={serialized.workers}
          locations={serialized.locations}
        />
      </PageFade>
    </div>
  );
}
