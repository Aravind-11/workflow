import { notFound } from "next/navigation";
import { getSelectedWarehouseId, getSelectedProjectId } from "@/lib/warehouse-context";
import { getStageContext } from "@/features/workflow/execute-stage";
import { StageExecutor } from "@/components/workflow/StageExecutor";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkflowBreadcrumb, buildBreadcrumbStages } from "@/components/ui/WorkflowBreadcrumb";
import { getNavLabelOverrides } from "@/lib/nav/labels";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ stageType: string }>;
}

export default async function GenericStagePage({ params }: Props) {
  const { stageType } = await params;

  const warehouseId = await getSelectedWarehouseId();
  if (!warehouseId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        No warehouse selected. Select a warehouse first.
      </p>
    );
  }

  const projectId = (await getSelectedProjectId()) ?? undefined;

  const result = await getStageContext(warehouseId, projectId, stageType);
  if (!result.ok || !result.data) return notFound();

  const { workflow, stage, allStages } = result.data;
  if (!stage) return notFound();

  const breadcrumbStages = buildBreadcrumbStages(
    allStages.map((s) => ({ type: s.type, label: s.label })),
  );
  const overrides = await getNavLabelOverrides();
  const stageHref = breadcrumbStages.find((s) => s.type === stageType)?.href;
  const titleOverride = stageHref ? overrides[stageHref] : undefined;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={titleOverride ?? stage.label}
        description={`Execute the "${titleOverride ?? stage.label}" stage of the active workflow.`}
      >
        <WorkflowBreadcrumb active={stageType} stages={breadcrumbStages} overrideLabels={overrides} />
      </SectionHeader>

      <StageExecutor
        warehouseId={warehouseId}
        projectId={projectId}
        stage={JSON.parse(JSON.stringify(stage))}
        workflowName={workflow.name}
      />
    </div>
  );
}
