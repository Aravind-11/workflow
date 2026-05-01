"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import {
  resolveWorkflow,
  validateTransition,
  evaluateRules,
  getNextStages,
  getEntryStages,
} from "@/lib/workflow/engine";
import type { RuleResult } from "@/lib/workflow/engine";
import type { WorkflowTemplateData, WorkflowStage } from "@/lib/workflow/types";
import { generateItemBarcode, generateEventBarcode } from "@/features/tracking/barcode-utils";
import { revalidatePath } from "next/cache";

export interface StageExecutionInput {
  warehouseId: string;
  projectId?: string;
  stageType: string;
  formData: Record<string, unknown>;
  trackingItemId?: string;
  fromStageType?: string;
}

export interface StageExecutionResult {
  stageCompleted: boolean;
  taskId?: string;
  trackingItemId?: string;
  itemBarcode?: string;
  eventBarcode?: string;
  nextStages: { type: string; label: string }[];
  ruleResults: RuleResult[];
  requiresApproval: boolean;
  autoAdvanced: boolean;
}

export async function executeStageAction(
  input: StageExecutionInput,
): Promise<ActionResult<StageExecutionResult>> {
  const guard = await guardAction(P.workflow.manage, input.warehouseId);
  if (!guard.ok) return guard;

  const workflow = await resolveWorkflow(
    input.warehouseId,
    input.projectId,
  );
  if (!workflow.id) {
    return { ok: false, error: "No active workflow found for this warehouse" };
  }

  const stage = workflow.stages.find((s) => s.type === input.stageType);
  if (!stage) {
    return { ok: false, error: `Stage type "${input.stageType}" not found in active workflow` };
  }

  if (input.fromStageType) {
    const fromStage = workflow.stages.find((s) => s.type === input.fromStageType);
    if (fromStage) {
      const transition = validateTransition(workflow, fromStage.id, stage.id);
      if (!transition.valid) {
        return { ok: false, error: transition.error ?? "Transition not allowed" };
      }
    }
  }

  const ruleResults = evaluateRules(workflow, stage.id, input.formData);

  const blockRule = ruleResults.find((r) => r.action === "block");
  if (blockRule) {
    return {
      ok: false,
      error: blockRule.action === "block" ? blockRule.message : "Blocked by rule",
    };
  }

  const skipRule = ruleResults.find((r) => r.action === "skip");

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.warehouseId },
    select: { code: true },
  });
  const whCode = warehouse?.code ?? "UNK";

  let project: { code: string } | null = null;
  if (input.projectId) {
    project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { code: true },
    });
  }

  let trackingItemId = input.trackingItemId;
  let itemBarcode: string | undefined;
  let eventBarcode: string | undefined;

  if (stage.behavior.generateBarcode && !trackingItemId) {
    const barcode = generateItemBarcode(whCode, project?.code);
    const item = await prisma.trackingItem.create({
      data: {
        barcode,
        warehouseId: input.warehouseId,
        projectId: input.projectId ?? null,
        skuCode: String(input.formData.skuCode ?? input.formData.boxName ?? "ITEM"),
        description: String(input.formData.description ?? ""),
      },
    });
    trackingItemId = item.id;
    itemBarcode = barcode;
  }

  if (trackingItemId) {
    const existingItem = await prisma.trackingItem.findUnique({
      where: { id: trackingItemId },
      select: { barcode: true },
    });
    if (existingItem) {
      itemBarcode = existingItem.barcode;
      const stageTag = (stage.behavior.barcodePrefix || stage.type).toUpperCase().slice(0, 4);
      eventBarcode = generateEventBarcode(existingItem.barcode, stageTag);

      await prisma.trackingEvent.create({
        data: {
          trackingItemId,
          stageType: stage.type,
          stageLabel: stage.label,
          barcode: eventBarcode,
          handledBy: guard.ctx.fullName ?? guard.ctx.email,
          notes: JSON.stringify(input.formData),
        },
      });
    }
  }

  let taskId: string | undefined;
  if (stage.behavior.createsTask) {
    const stageToTaskType: Record<string, "RECEIPT" | "PUTAWAY" | "PICK" | "PACK" | "SHIPMENT" | "RETURN" | "CYCLE_COUNT" | "MAINTENANCE"> = {
      receive: "RECEIPT",
      putaway: "PUTAWAY",
      pick: "PICK",
      pack: "PACK",
      ship: "SHIPMENT",
      return: "RETURN",
    };
    const taskType = stageToTaskType[stage.type] ?? "MAINTENANCE";
    const task = await prisma.task.create({
      data: {
        warehouseId: input.warehouseId,
        title: `${stage.label}: ${input.formData.boxName ?? input.formData.skuCode ?? "Item"}`,
        taskType,
        priority: 3,
        relatedEntity: "WorkflowStage",
        relatedEntityId: stage.id,
        workflowStageId: stage.id,
        workflowStageType: stage.type,
      },
    });
    taskId = task.id;
  }

  const requiresApproval = stage.behavior.requiresApproval;

  const nextStages = skipRule
    ? getNextStagesAfterSkip(workflow, stage)
    : getNextStages(workflow, stage.id);

  let autoAdvanced = false;
  if (stage.behavior.autoAdvance && nextStages.length === 1 && !requiresApproval) {
    autoAdvanced = true;
  }

  const routeRule = ruleResults.find((r) => r.action === "route_to");
  let finalNextStages = nextStages;
  if (routeRule && routeRule.action === "route_to") {
    const target = workflow.stages.find((s) => s.id === routeRule.targetStageId);
    if (target) {
      finalNextStages = [target];
    }
  }

  revalidatePath("/workflow");
  revalidatePath("/tracking");
  revalidatePath("/tasks");

  return {
    ok: true,
    data: {
      stageCompleted: !requiresApproval,
      taskId,
      trackingItemId,
      itemBarcode,
      eventBarcode,
      nextStages: finalNextStages.map((s) => ({ type: s.type, label: s.label })),
      ruleResults,
      requiresApproval,
      autoAdvanced,
    },
  };
}

function getNextStagesAfterSkip(
  workflow: WorkflowTemplateData,
  skippedStage: WorkflowStage,
): WorkflowStage[] {
  const immediate = getNextStages(workflow, skippedStage.id);
  const result: WorkflowStage[] = [];
  for (const s of immediate) {
    result.push(...getNextStages(workflow, s.id));
  }
  return result.length > 0 ? result : immediate;
}

export async function getStageContext(
  warehouseId: string,
  projectId?: string,
  stageType?: string,
): Promise<ActionResult<{
  workflow: WorkflowTemplateData;
  stage: WorkflowStage | null;
  entryStages: { type: string; label: string }[];
  allStages: { type: string; label: string; id: string }[];
}>> {
  const guard = await guardAction(P.warehouses.view, warehouseId);
  if (!guard.ok) return guard;

  const workflow = await resolveWorkflow(warehouseId, projectId);

  const stage = stageType
    ? workflow.stages.find((s) => s.type === stageType) ?? null
    : null;

  const entries = getEntryStages(workflow);

  return {
    ok: true,
    data: {
      workflow,
      stage,
      entryStages: entries.map((s) => ({ type: s.type, label: s.label })),
      allStages: workflow.stages.map((s) => ({
        type: s.type,
        label: s.label,
        id: s.id,
      })),
    },
  };
}
