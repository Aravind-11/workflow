"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function listPendingApprovals(warehouseId?: string) {
  return prisma.approvalRequest.findMany({
    where: {
      status: "PENDING",
      ...(warehouseId ? { warehouseId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function approveRequestAction(
  requestId: string,
  note?: string,
): Promise<ActionResult> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return { ok: false, error: "Request not found" };

  const guard = await guardAction(P.approvals.manage, request.warehouseId);
  if (!guard.ok) return guard;

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      reviewedBy: guard.ctx.userId,
      reviewNote: note ?? null,
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/approvals");
  return { ok: true };
}

export async function rejectRequestAction(
  requestId: string,
  note?: string,
): Promise<ActionResult> {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return { ok: false, error: "Request not found" };

  const guard = await guardAction(P.approvals.manage, request.warehouseId);
  if (!guard.ok) return guard;

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedBy: guard.ctx.userId,
      reviewNote: note ?? null,
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/approvals");
  return { ok: true };
}

export async function createApprovalRequest(input: {
  warehouseId: string;
  stageType: string;
  stageLabel: string;
  entityType: string;
  entityId: string;
  requestedBy?: string;
}) {
  return prisma.approvalRequest.create({ data: input });
}
