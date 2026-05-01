import { prisma } from "@/server/db/prisma";
import { createStageFromTemplate } from "@/lib/workflow/registry";
import type { BuiltInStageType, WorkflowStage, WorkflowEdge } from "@/lib/workflow/types";

const STAGE_ALIASES: Record<string, BuiltInStageType> = {
  receive: "receive", receiving: "receive", "check-in": "receive", checkin: "receive",
  recieve: "receive", recive: "receive", receve: "receive",
  manifest: "receive", intake: "receive", inbound: "receive",
  qc: "qc", "quality check": "qc", "quality control": "qc", inspect: "qc",
  inspection: "qc", verify: "qc", verification: "qc", audit: "qc",
  putaway: "putaway", "put away": "putaway", store: "putaway", storage: "putaway",
  putwaay: "putaway", putawya: "putaway",
  shelve: "putaway", stow: "putaway",
  pick: "pick", picking: "pick", pull: "pick",
  pack: "pack", packing: "pack", package: "pack", packaging: "pack",
  hold: "hold", staging: "hold", wait: "hold", queue: "hold",
  ship: "ship", shipping: "ship", dispatch: "ship", deliver: "ship",
  delivery: "ship", outbound: "ship", send: "ship",
  return: "return", returns: "return", rma: "return", reverse: "return",
  scan: "custom", scanning: "custom", "document scan": "custom",
  prep: "custom", preparation: "custom", "document prep": "custom", "doc prep": "custom",
  "document management": "custom", labeling: "custom", label: "custom",
  sort: "custom", sorting: "custom", review: "custom",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseStagesFromMessage(msg: string): { type: BuiltInStageType; label: string }[] {
  const lower = msg.toLowerCase();

  const sortedAliases = Object.entries(STAGE_ALIASES).sort(
    (a, b) => b[0].length - a[0].length,
  );

  // Find all matches with their position in the user's message
  const matches: { pos: number; type: BuiltInStageType; label: string }[] = [];
  const usedTypes = new Set<string>();

  for (const [alias, type] of sortedAliases) {
    const pos = lower.indexOf(alias);
    if (pos === -1) continue;

    // Avoid adding the same stage type twice (e.g. "receive" and "recive")
    const key = `${type}:${alias}`;
    if (usedTypes.has(type)) continue;
    usedTypes.add(type);

    const CANONICAL_LABELS: Record<BuiltInStageType, string> = {
      receive: "Receive", qc: "QC / Inspect", putaway: "Putaway",
      pick: "Pick", pack: "Pack", hold: "Hold", ship: "Ship",
      return: "Return", custom: alias.charAt(0).toUpperCase() + alias.slice(1),
    };

    matches.push({ pos, type, label: CANONICAL_LABELS[type] });
  }

  // Sort by position in the user's message to preserve their intended order
  matches.sort((a, b) => a.pos - b.pos);

  return matches;
}

function extractWorkflowName(msg: string): string {
  const forMatch = msg.match(/(?:workflow|pipeline|process|wf)\s+(?:for|called|named)\s+["']?([^"'\n,]+?)["']?(?:\s*[,]|\s*$)/i);
  if (forMatch) return capitalize(forMatch[1].trim());

  const beforeWfMatch = msg.match(/(?:for|called|named)\s+["']?([^"'\n,]+?)["']?\s*(?:workflow|pipeline|wf)/i);
  if (beforeWfMatch) return capitalize(beforeWfMatch[1].trim());

  const cleaned = msg
    .replace(/^.*?(?:create|build|make|design|set\s*up|generate|craete|creat)\s+(?:a\s+)?/i, "")
    .replace(/^(?:workflow|pipeline|wf|process)\s+(?:for\s+)?/i, "")
    .replace(/[,].*$/, "")
    .trim();

  if (cleaned && cleaned.length > 2) return capitalize(cleaned);

  return "Custom Workflow";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface WorkflowCreateResult {
  created: true;
  workflowId: string;
  name: string;
  stageCount: number;
  stages: { type: string; label: string }[];
  designerUrl: string;
}

export async function tryCreateWorkflow(
  userMessage: string,
  warehouseId: string | undefined,
): Promise<WorkflowCreateResult | null> {
  const msg = userMessage.toLowerCase();

  const isCreateVerb = /cr[ea]{1,3}te|build|make|design|set\s*up|generate/i.test(msg);
  const isWorkflowNoun = /work\s*flow|pipe\s*line|process|wf\b/i.test(msg);
  if (!isCreateVerb || !isWorkflowNoun) return null;
  if (!warehouseId) return null;

  const parsedStages = parseStagesFromMessage(msg);

  if (parsedStages.length === 0) {
    parsedStages.push(
      { type: "receive", label: "Receive" },
      { type: "custom", label: "Process" },
      { type: "ship", label: "Ship" },
    );
  }

  const stages: WorkflowStage[] = parsedStages.map((desc, i) => {
    const stage = createStageFromTemplate(desc.type, {
      x: 50 + i * 300,
      y: 100,
    });
    stage.label = desc.label;
    return stage;
  });

  const edges: WorkflowEdge[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const src = stages[i];
    const tgt = stages[i + 1];
    const srcPort = src.outputs[0];
    const tgtPort = tgt.inputs[0];
    if (srcPort && tgtPort) {
      edges.push({
        id: uid(),
        source: src.id,
        sourcePort: srcPort.id,
        target: tgt.id,
        targetPort: tgtPort.id,
      });
    }
  }

  const name = extractWorkflowName(userMessage);

  const created = await prisma.workflowTemplate.create({
    data: {
      warehouseId,
      name,
      stages: JSON.parse(JSON.stringify(stages)),
      edges: JSON.parse(JSON.stringify(edges)),
    },
  });

  return {
    created: true,
    workflowId: created.id,
    name: created.name,
    stageCount: stages.length,
    stages: stages.map((s) => ({ type: s.type, label: s.label })),
    designerUrl: `/warehouses/${warehouseId}/workflow?templateId=${created.id}`,
  };
}
