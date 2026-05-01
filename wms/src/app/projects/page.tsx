import { listProjects } from "@/features/projects/service";
import { listWarehousesForSelect } from "@/features/logistics/service";
import { ProjectListClient } from "@/components/projects/project-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { serialize } from "@/lib/utils";
import { getViewMode } from "@/lib/auth/view-mode";
import { getSelectedWarehouseId } from "@/lib/warehouse-context";

export default async function ProjectsPage() {
  // In operator mode, scope the project list to the active warehouse so
  // we don't surface programs from sites the operator can't act on.
  // Admin mode keeps the full cross-warehouse directory.
  const [mode, selectedWarehouseId] = await Promise.all([
    getViewMode(),
    getSelectedWarehouseId(),
  ]);
  const projectScope =
    mode === "operator" && selectedWarehouseId ? selectedWarehouseId : undefined;

  const [projects, warehouses] = await Promise.all([
    listProjects(projectScope),
    listWarehousesForSelect(),
  ]);

  const serialized = serialize(projects);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        eyebrow="Customers · Projects"
        title="Projects"
        subtitle="Customer programs running on the network. Each project owns its own workflows, tracking items, and approvals."
      />

      <ProjectListClient
        projects={serialized}
        warehouses={serialize(warehouses)}
      />
    </div>
  );
}
