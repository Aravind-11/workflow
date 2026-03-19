"use server";

import { createShiftTemplateSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function createShiftTemplateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createShiftTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid shift template" };
  }
  const d = parsed.data;
  const auth = await guardAction(P.workers.manage, d.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };
  try {
    const shift = await prisma.shift.create({
      data: {
        warehouseId: d.warehouseId,
        name: d.name,
        shiftType: d.shiftType,
        startTime: d.startTime,
        endTime: d.endTime,
        isOvernight: d.isOvernight ?? false,
      },
    });
    revalidateWorkers();
    return { ok: true, data: { id: shift.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}
