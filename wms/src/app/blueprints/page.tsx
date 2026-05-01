import { listBlueprints } from "@/features/workflow/blueprint-actions";
import { BlueprintLibrary } from "@/components/workflow/BlueprintLibrary";
import { getSelectedWarehouseId, getSelectedProjectId } from "@/lib/warehouse-context";

export const dynamic = "force-dynamic";

export default async function BlueprintsPage() {
  const result = await listBlueprints();
  const blueprints = result.ok && result.data ? result.data : [];
  const warehouseId = await getSelectedWarehouseId();
  const projectId = await getSelectedProjectId();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          Workflow Blueprints
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Reusable workflow templates. Import any blueprint into your current warehouse.
        </p>
      </header>

      <BlueprintLibrary
        blueprints={JSON.parse(JSON.stringify(blueprints))}
        warehouseId={warehouseId}
        projectId={projectId}
      />
    </div>
  );
}
