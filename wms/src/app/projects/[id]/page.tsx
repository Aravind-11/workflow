import { getProject } from "@/features/projects/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Projects
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {project.name}
          </h2>
          <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
            {project.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Code: <span className="font-mono">{project.code}</span> · Warehouse: {project.warehouse.code} — {project.warehouse.name}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Customer</span>
            <p className="text-gray-600 dark:text-gray-400">{project.customerName}</p>
          </div>
          {project.contactEmail && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Email</span>
              <p className="text-gray-600 dark:text-gray-400">{project.contactEmail}</p>
            </div>
          )}
          {project.contactPhone && (
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Phone</span>
              <p className="text-gray-600 dark:text-gray-400">{project.contactPhone}</p>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Tracking Items</span>
            <p className="text-gray-600 dark:text-gray-400">{project._count.trackingItems}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Linked Workflows
        </h3>
        {project.workflows.length === 0 ? (
          <p className="text-sm text-gray-500">No workflows linked to this project yet.</p>
        ) : (
          <div className="space-y-2">
            {project.workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{wf.name}</span>
                  <span className="ml-2 text-xs text-gray-500">v{wf.version}</span>
                </div>
                <Badge variant={wf.isActive ? "default" : "secondary"}>
                  {wf.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
