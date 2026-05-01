"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import type { WorkflowBlueprint } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function publishToLibrary(
  templateId: string,
  meta: { name?: string; description?: string; category?: string },
): Promise<ActionResult<WorkflowBlueprint>> {
  const guard = await guardAction(P.workflow.manage);
  if (!guard.ok) return guard;

  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return { ok: false, error: "Workflow template not found" };

  const blueprint = await prisma.workflowBlueprint.create({
    data: {
      name: meta.name ?? template.name,
      description: meta.description ?? null,
      category: meta.category ?? null,
      stages: template.stages ?? [],
      edges: template.edges ?? [],
      isPublished: true,
      createdBy: guard.ctx.userId,
    },
  });

  revalidatePath("/blueprints");
  return { ok: true, data: blueprint };
}

export async function importFromLibrary(
  blueprintId: string,
  warehouseId: string,
  projectId?: string,
): Promise<ActionResult<{ templateId: string }>> {
  const guard = await guardAction(P.workflow.manage, warehouseId);
  if (!guard.ok) return guard;

  const blueprint = await prisma.workflowBlueprint.findUnique({
    where: { id: blueprintId },
  });
  if (!blueprint) return { ok: false, error: "Blueprint not found" };

  const template = await prisma.workflowTemplate.create({
    data: {
      warehouseId,
      projectId: projectId ?? null,
      name: blueprint.name,
      stages: blueprint.stages ?? [],
      edges: blueprint.edges ?? [],
    },
  });

  revalidatePath(`/warehouses/${warehouseId}`);
  return { ok: true, data: { templateId: template.id } };
}

export async function listBlueprints(
  category?: string,
): Promise<ActionResult<WorkflowBlueprint[]>> {
  const guard = await guardAction(P.warehouses.view);
  if (!guard.ok) return guard;

  const blueprints = await prisma.workflowBlueprint.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: blueprints };
}

export async function getBlueprint(
  id: string,
): Promise<ActionResult<WorkflowBlueprint>> {
  const guard = await guardAction(P.warehouses.view);
  if (!guard.ok) return guard;

  const blueprint = await prisma.workflowBlueprint.findUnique({
    where: { id },
  });
  if (!blueprint) return { ok: false, error: "Blueprint not found" };

  return { ok: true, data: blueprint };
}

export async function deleteBlueprint(
  id: string,
): Promise<ActionResult> {
  const guard = await guardAction(P.workflow.manage);
  if (!guard.ok) return guard;

  await prisma.workflowBlueprint.delete({ where: { id } });
  revalidatePath("/blueprints");
  return { ok: true };
}
