import { redirect } from "next/navigation";
import { getSelectedWarehouseId } from "@/lib/warehouse-context";

/**
 * The top-level "Workflow" tab is just a shortcut into the per-warehouse
 * Workflow Designer. We resolve the user's currently selected warehouse and
 * forward there. The CSV-upload UI that used to live here is gone — the
 * designer is the workflow surface.
 */
export default async function WorkflowPage() {
  const warehouseId = await getSelectedWarehouseId();
  if (!warehouseId) redirect("/");
  redirect(`/warehouses/${warehouseId}/workflow`);
}
