import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getAuthContext } from "@/lib/auth/session";
import { WorkflowDesigner } from "@/components/workflow/WorkflowDesigner";
import { serialize } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WorkflowDesignerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const projectId = typeof sp.projectId === "string" ? sp.projectId : undefined;

  const templateId = typeof sp.templateId === "string" ? sp.templateId : undefined;

  const ctx = await getAuthContext();
  if (!ctx) notFound();

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    select: { id: true, name: true, code: true },
  });
  if (!warehouse) notFound();

  let project: { id: string; name: string; code: string } | null = null;
  if (projectId) {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, code: true },
    });
  }

  // Load a specific template by ID, or fall back to the active one
  const activeTemplate = templateId
    ? await prisma.workflowTemplate.findUnique({ where: { id: templateId } })
    : await prisma.workflowTemplate.findFirst({
        where: {
          warehouseId: id,
          isActive: true,
          ...(projectId ? { projectId } : { projectId: null }),
        },
      });

  const breadcrumbLabel = project
    ? `${warehouse.name} / ${project.name}`
    : warehouse.name;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-gray-950">
        <Link
          href={`/warehouses/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {breadcrumbLabel}
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Workflow Designer
        </h1>
        {project && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Project: {project.code}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowDesigner
          warehouseId={id}
          projectId={projectId}
          initial={activeTemplate ? serialize(activeTemplate) : null}
        />
      </div>
    </div>
  );
}
