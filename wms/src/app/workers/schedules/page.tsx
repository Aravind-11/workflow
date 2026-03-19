import { format, startOfWeek } from "date-fns";
import { WeeklyScheduleBoard } from "@/components/workers/weekly-schedule-board";
import {
  listLocationsForWarehouse,
  listSchedulesForWeek,
  listShiftsForWarehouse,
  listWarehouseOptions,
  listWorkersForWarehouse,
} from "@/features/workers/service";
import { pickString, serialize } from "@/lib/utils";

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehouseOptions();
  const warehouseId = pickString(params.warehouseId) ?? warehouses[0]?.id;
  const weekRaw = pickString(params.week);
  const weekStart = weekRaw
    ? startOfWeek(new Date(weekRaw), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  if (!warehouseId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        No warehouses found. Seed the database to use scheduling.
      </p>
    );
  }

  const [weekData, shifts, workers, locations] = await Promise.all([
    listSchedulesForWeek({ warehouseId, weekStart }),
    listShiftsForWarehouse(warehouseId),
    listWorkersForWarehouse(warehouseId),
    listLocationsForWarehouse(warehouseId),
  ]);

  const serialized = serialize({ weekData, shifts, workers, locations });

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
        method="get"
      >
        <label className="text-sm">
          <span className="text-gray-600">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId}
            className="mt-1 block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-gray-600">Week starting</span>
          <input
            type="date"
            name="week"
            defaultValue={format(weekStart, "yyyy-MM-dd")}
            className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply
        </button>
      </form>

      <WeeklyScheduleBoard
        warehouseId={warehouseId}
        weekStartIso={serialized.weekData.weekStart}
        weekEndIso={serialized.weekData.weekEnd}
        schedules={serialized.weekData.schedules}
        shifts={serialized.shifts}
        workers={serialized.workers}
        locations={serialized.locations}
      />
    </div>
  );
}
