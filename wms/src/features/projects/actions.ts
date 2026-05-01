"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

interface CreateProjectInput {
  warehouseId: string;
  code: string;
  name: string;
  customerName: string;
  contactEmail?: string;
  contactPhone?: string;
}

export async function createProjectAction(input: CreateProjectInput): Promise<ActionResult<{ id: string }>> {
  const auth = await guardAction(P.projects.manage, input.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const existing = await prisma.project.findUnique({
    where: { warehouseId_code: { warehouseId: input.warehouseId, code: input.code } },
  });
  if (existing) {
    return { ok: false, error: `Project with code "${input.code}" already exists in this warehouse.` };
  }

  const project = await prisma.project.create({ data: input });
  revalidatePath("/projects");
  revalidatePath(`/warehouses/${input.warehouseId}`);
  return { ok: true, data: { id: project.id } };
}

export async function updateProjectAction(
  id: string,
  data: Partial<Pick<CreateProjectInput, "name" | "customerName" | "contactEmail" | "contactPhone" | "code">>,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Project not found" };
  const auth = await guardAction(P.projects.manage, existing.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const project = await prisma.project.update({ where: { id }, data });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true, data: { id: project.id } };
}

export async function deleteProjectAction(id: string): Promise<ActionResult<null>> {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Project not found" };
  const auth = await guardAction(P.projects.manage, existing.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  return { ok: true, data: null };
}
