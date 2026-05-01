import { resolveWorkflow, validateTransition as _validateTransition } from "./engine";

/**
 * Check if a workflow transition is allowed for a warehouse.
 * Returns `{ allowed: true }` if no active workflow exists (backward compatible)
 * or if the transition is valid.
 */
export async function checkWorkflowTransition(
  warehouseId: string,
  fromStageType: string,
  toStageType: string,
  projectId?: string,
): Promise<{ allowed: boolean; error?: string }> {
  const workflow = await resolveWorkflow(warehouseId, projectId);

  if (!workflow.id) {
    return { allowed: true };
  }

  const fromStage = workflow.stages.find((s) => s.type === fromStageType);
  const toStage = workflow.stages.find((s) => s.type === toStageType);

  if (!fromStage || !toStage) {
    return { allowed: true };
  }

  const result = _validateTransition(workflow, fromStage.id, toStage.id);
  return { allowed: result.valid, error: result.error };
}
