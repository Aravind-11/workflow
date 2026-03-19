"use server";

import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/server/audit";
import { prisma } from "@/server/db/prisma";
import { addCommentSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateReturns } from "./shared";

export async function addReturnCommentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid comment" };
  const { returnRmaId, body, isInternal, userId } = parsed.data;
  const rma = await prisma.returnRMA.findUnique({ where: { id: returnRmaId } });
  if (!rma) return { ok: false, error: "RMA not found" };
  const auth = await guardAction(P.returns.manage, rma.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const c = await prisma.$transaction(async (tx) => {
    const row = await tx.returnComment.create({
      data: {
        returnRmaId,
        body,
        isInternal: isInternal ?? true,
        userId: userId ?? null,
      },
    });
    await writeAuditLog(
      {
        warehouseId: rma.warehouseId,
        entityType: "ReturnRMA",
        entityId: returnRmaId,
        action: "RETURN_COMMENT_ADDED",
        newValues: {
          commentId: row.id,
          isInternal: row.isInternal,
          preview: body.slice(0, 120),
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return row;
  });
  revalidateReturns(returnRmaId);
  return { ok: true, data: { id: c.id } };
}
