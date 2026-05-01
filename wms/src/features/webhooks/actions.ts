"use server";

import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

interface CreateWebhookInput {
  warehouseId: string;
  url: string;
  events: string[];
}

export async function createWebhookAction(
  input: CreateWebhookInput,
): Promise<ActionResult<{ id: string; secret: string }>> {
  const guard = await guardAction(P.admin.settings, input.warehouseId);
  if (!guard.ok) return guard;

  const secret = `whsec_${nanoid(32)}`;

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      warehouseId: input.warehouseId,
      url: input.url,
      secret,
      events: input.events,
    },
  });

  revalidatePath("/settings");
  return { ok: true, data: { id: endpoint.id, secret } };
}

export async function listWebhooksAction(
  warehouseId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof prisma.webhookEndpoint.findMany>>>> {
  const guard = await guardAction(P.admin.settings, warehouseId);
  if (!guard.ok) return guard;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { warehouseId },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: endpoints };
}

export async function toggleWebhookAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: { warehouseId: true },
  });
  if (!endpoint) return { ok: false, error: "Endpoint not found" };

  const guard = await guardAction(P.admin.settings, endpoint.warehouseId);
  if (!guard.ok) return guard;

  await prisma.webhookEndpoint.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: { warehouseId: true },
  });
  if (!endpoint) return { ok: false, error: "Endpoint not found" };

  const guard = await guardAction(P.admin.settings, endpoint.warehouseId);
  if (!guard.ok) return guard;

  await prisma.webhookEndpoint.delete({ where: { id } });

  revalidatePath("/settings");
  return { ok: true };
}

export const WEBHOOK_EVENTS = [
  "tracking.event.created",
  "task.status.changed",
  "workflow.stage.completed",
  "approval.requested",
  "approval.resolved",
  "order.status.changed",
  "transfer.status.changed",
] as const;
