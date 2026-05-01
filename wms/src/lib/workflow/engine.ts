import { prisma } from "@/server/db/prisma";
import type {
  WorkflowStage,
  WorkflowEdge,
  WorkflowTemplateData,
  StageRule,
  StageField,
} from "./types";
import { createStageFromTemplate } from "./registry";

// ─── Resolve active workflow for a warehouse ────────────────────────────────

export async function resolveWorkflow(
  warehouseId: string,
  projectId?: string,
): Promise<WorkflowTemplateData> {
  let template = projectId
    ? await prisma.workflowTemplate.findFirst({
        where: { warehouseId, projectId, isActive: true },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  if (!template) {
    template = await prisma.workflowTemplate.findFirst({
      where: { warehouseId, projectId: null, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (template) {
    return {
      id: template.id,
      warehouseId: template.warehouseId,
      name: template.name,
      version: template.version,
      isActive: template.isActive,
      stages: template.stages as unknown as WorkflowStage[],
      edges: template.edges as unknown as WorkflowEdge[],
    };
  }

  return buildDefaultWorkflow(warehouseId);
}

// ─── Graph traversal helpers ────────────────────────────────────────────────

export function getNextStages(
  workflow: WorkflowTemplateData,
  currentStageId: string,
): WorkflowStage[] {
  const targetIds = workflow.edges
    .filter((e) => e.source === currentStageId)
    .map((e) => e.target);

  return workflow.stages.filter((s) => targetIds.includes(s.id));
}

export function getPreviousStages(
  workflow: WorkflowTemplateData,
  currentStageId: string,
): WorkflowStage[] {
  const sourceIds = workflow.edges
    .filter((e) => e.target === currentStageId)
    .map((e) => e.source);

  return workflow.stages.filter((s) => sourceIds.includes(s.id));
}

export function getEntryStages(workflow: WorkflowTemplateData): WorkflowStage[] {
  const targetIds = new Set(workflow.edges.map((e) => e.target));
  return workflow.stages.filter((s) => !targetIds.has(s.id));
}

// ─── Transition validation ──────────────────────────────────────────────────

export function validateTransition(
  workflow: WorkflowTemplateData,
  fromStageId: string,
  toStageId: string,
): { valid: boolean; error?: string } {
  const edge = workflow.edges.find(
    (e) => e.source === fromStageId && e.target === toStageId,
  );

  if (!edge) {
    const fromStage = workflow.stages.find((s) => s.id === fromStageId);
    const toStage = workflow.stages.find((s) => s.id === toStageId);
    return {
      valid: false,
      error: `Transition from "${fromStage?.label ?? fromStageId}" to "${toStage?.label ?? toStageId}" is not allowed by the workflow`,
    };
  }

  return { valid: true };
}

// ─── Data flow resolution ───────────────────────────────────────────────────

export interface PortMapping {
  sourcePort: string;
  sourcePortLabel: string;
  sourcePortDataType: string;
  targetPort: string;
  targetPortLabel: string;
  targetPortDataType: string;
}

export function resolveDataFlow(
  workflow: WorkflowTemplateData,
  fromStageId: string,
  toStageId: string,
): PortMapping[] {
  const relevantEdges = workflow.edges.filter(
    (e) => e.source === fromStageId && e.target === toStageId,
  );

  const fromStage = workflow.stages.find((s) => s.id === fromStageId);
  const toStage = workflow.stages.find((s) => s.id === toStageId);
  if (!fromStage || !toStage) return [];

  return relevantEdges.map((edge) => {
    const srcPort = fromStage.outputs.find((p) => p.id === edge.sourcePort);
    const tgtPort = toStage.inputs.find((p) => p.id === edge.targetPort);
    return {
      sourcePort: edge.sourcePort,
      sourcePortLabel: srcPort?.label ?? "",
      sourcePortDataType: srcPort?.dataType ?? "",
      targetPort: edge.targetPort,
      targetPortLabel: tgtPort?.label ?? "",
      targetPortDataType: tgtPort?.dataType ?? "",
    };
  });
}

// ─── Stage field resolution ─────────────────────────────────────────────────

export function getStageFields(
  workflow: WorkflowTemplateData,
  stageId: string,
): StageField[] {
  const stage = workflow.stages.find((s) => s.id === stageId);
  return stage?.fields ?? [];
}

// ─── Rule evaluation ────────────────────────────────────────────────────────

export type RuleResult =
  | { action: "route_to"; targetStageId: string }
  | { action: "skip" }
  | { action: "flag"; message: string }
  | { action: "block"; message: string };

export function evaluateRules(
  workflow: WorkflowTemplateData,
  stageId: string,
  data: Record<string, unknown>,
): RuleResult[] {
  const stage = workflow.stages.find((s) => s.id === stageId);
  if (!stage) return [];

  const results: RuleResult[] = [];

  for (const rule of stage.rules) {
    if (evaluateCondition(rule, data)) {
      switch (rule.action) {
        case "route_to":
          if (rule.targetStageId) {
            results.push({ action: "route_to", targetStageId: rule.targetStageId });
          }
          break;
        case "skip":
          results.push({ action: "skip" });
          break;
        case "flag":
          results.push({ action: "flag", message: rule.message ?? "Flagged by rule" });
          break;
        case "block":
          results.push({ action: "block", message: rule.message ?? "Blocked by rule" });
          break;
      }
    }
  }

  return results;
}

function evaluateCondition(
  rule: StageRule,
  data: Record<string, unknown>,
): boolean {
  const fieldValue = String(data[rule.condition.field] ?? "");
  const compareValue = rule.condition.value;

  switch (rule.condition.operator) {
    case "eq":
      return fieldValue === compareValue;
    case "neq":
      return fieldValue !== compareValue;
    case "gt":
      return Number(fieldValue) > Number(compareValue);
    case "lt":
      return Number(fieldValue) < Number(compareValue);
    case "contains":
      return fieldValue.toLowerCase().includes(compareValue.toLowerCase());
    case "is_empty":
      return fieldValue === "";
    case "is_not_empty":
      return fieldValue !== "";
    default:
      return false;
  }
}

// ─── Topological sort (for breadcrumb ordering) ─────────────────────────────

export function topologicalSort(workflow: WorkflowTemplateData): WorkflowStage[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const stage of workflow.stages) {
    inDegree.set(stage.id, 0);
    adj.set(stage.id, []);
  }

  for (const edge of workflow.edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  const stageMap = new Map(workflow.stages.map((s) => [s.id, s]));
  return sorted.map((id) => stageMap.get(id)!).filter(Boolean);
}

// ─── DAG validation ─────────────────────────────────────────────────────────

export function validateDAG(
  stages: WorkflowStage[],
  edges: WorkflowEdge[],
): { valid: boolean; error?: string } {
  if (stages.length === 0) {
    return { valid: false, error: "Workflow must have at least one stage" };
  }

  const stageIds = new Set(stages.map((s) => s.id));
  for (const edge of edges) {
    if (!stageIds.has(edge.source)) {
      return { valid: false, error: `Edge references unknown source stage` };
    }
    if (!stageIds.has(edge.target)) {
      return { valid: false, error: `Edge references unknown target stage` };
    }
  }

  // Cycle detection via topological sort
  const sorted = topologicalSort({ id: "", warehouseId: "", name: "", version: 0, isActive: false, stages, edges });
  if (sorted.length !== stages.length) {
    return { valid: false, error: "Workflow contains a cycle — only forward-flowing graphs are allowed" };
  }

  // Connectivity check: all stages should be reachable from entry stages
  const adj = new Map<string, string[]>();
  for (const stage of stages) adj.set(stage.id, []);
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
  }

  const targetIds = new Set(edges.map((e) => e.target));
  const entryIds = stages.filter((s) => !targetIds.has(s.id)).map((s) => s.id);

  if (entryIds.length === 0 && stages.length > 1) {
    return { valid: false, error: "No entry stage found — at least one stage must have no incoming edges" };
  }

  const visited = new Set<string>();
  const stack = [...entryIds];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adj.get(current) ?? []) {
      stack.push(neighbor);
    }
  }

  if (visited.size !== stages.length) {
    const unreachable = stages.filter((s) => !visited.has(s.id));
    return {
      valid: false,
      error: `${unreachable.length} stage(s) are not connected to the workflow: ${unreachable.map((s) => s.label).join(", ")}`,
    };
  }

  return { valid: true };
}

// ─── Default workflow fallback ──────────────────────────────────────────────

export function buildDefaultWorkflow(warehouseId: string): WorkflowTemplateData {
  const receive = createStageFromTemplate("receive", { x: 0, y: 0 });
  const pick = createStageFromTemplate("pick", { x: 300, y: 0 });
  const pack = createStageFromTemplate("pack", { x: 600, y: 0 });
  const ship = createStageFromTemplate("ship", { x: 900, y: 0 });

  const edges: WorkflowEdge[] = [
    {
      id: "default-e1",
      source: receive.id,
      sourcePort: receive.outputs[0]?.id ?? "",
      target: pick.id,
      targetPort: pick.inputs[0]?.id ?? "",
    },
    {
      id: "default-e2",
      source: pick.id,
      sourcePort: pick.outputs[0]?.id ?? "",
      target: pack.id,
      targetPort: pack.inputs[0]?.id ?? "",
    },
    {
      id: "default-e3",
      source: pack.id,
      sourcePort: pack.outputs[0]?.id ?? "",
      target: ship.id,
      targetPort: ship.inputs[0]?.id ?? "",
    },
  ];

  return {
    id: "",
    warehouseId,
    name: "Default Workflow",
    version: 0,
    isActive: false,
    stages: [receive, pick, pack, ship],
    edges,
  };
}
