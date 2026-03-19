"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { upsertSkuSchema } from "../schemas";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";

export async function upsertInventoryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertSkuSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid SKU data" };
  }
  const data = parsed.data;

  const auth = await guardAction(P.inventory.write);
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    if (data.id && String(data.id).trim()) {
      const updated = await prisma.inventoryItem.update({
        where: { id: data.id },
        data: {
          skuCode: data.skuCode,
          barcode: data.barcode || null,
          name: data.name,
          description: data.description ?? null,
          category: data.category ?? null,
          uom: data.uom ?? "EA",
          reorderPoint: data.reorderPoint ?? null,
          lotTracked: data.lotTracked ?? true,
          batchTracked: data.batchTracked ?? true,
          expiryTracked: data.expiryTracked ?? false,
        },
      });
      revalidatePath("/inventory/catalog");
      return { ok: true, data: { id: updated.id } };
    }

    const created = await prisma.inventoryItem.create({
      data: {
        skuCode: data.skuCode,
        barcode: data.barcode || null,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        uom: data.uom ?? "EA",
        reorderPoint: data.reorderPoint ?? null,
        lotTracked: data.lotTracked ?? true,
        batchTracked: data.batchTracked ?? true,
        expiryTracked: data.expiryTracked ?? false,
      },
    });
    revalidatePath("/inventory/catalog");
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}
