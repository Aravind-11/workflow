import { TaskVisualizer } from "@/components/visualizer/task-visualizer";
import {
  getFloorPlan,
  getRouteTemplates,
  getTaskLogs,
  getTasksForMap,
} from "@/features/floor-plan/service";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { listWorkersForWarehouse } from "@/features/workers/service";
import { pickString } from "@/lib/utils";

export default async function VisualizerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const warehouseId = pickString(params.warehouseId) ?? warehouses[0]?.id;

  if (!warehouseId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        No warehouses found. Add a warehouse first.
      </p>
    );
  }

  const [floorPlan, tasks, workersRaw, routeTemplates] = await Promise.all([
    getFloorPlan(warehouseId),
    getTasksForMap(warehouseId),
    listWorkersForWarehouse(warehouseId),
    getRouteTemplates(warehouseId),
  ]);

  const taskLogs: Record<string, Awaited<ReturnType<typeof getTaskLogs>>> = {};
  for (const t of tasks) {
    taskLogs[t.id] = await getTaskLogs(t.id);
  }

  const workers = workersRaw.map((w) => ({
    id: w.id,
    name: `${w.firstName} ${w.lastName}`,
  }));

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface"
        method="get"
      >
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-400">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId}
            className="mt-1 block w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Load
        </button>
      </form>

      <TaskVisualizer
        warehouseId={warehouseId}
        floorPlan={floorPlan}
        tasks={tasks}
        taskLogs={taskLogs}
        workers={workers}
        routeTemplates={routeTemplates}
      />
    </div>
  );
}
