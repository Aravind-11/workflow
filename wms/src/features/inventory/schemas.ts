import { z } from "zod";

export const receiveStockSchema = z.object({
  warehouseId: z.string().min(1),
  locationId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  /** Use with RHF `valueAsNumber` — avoids Zod 4 `z.coerce` + resolver input typing issues */
  quantity: z.number().int().positive(),
  lotNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

export const moveStockSchema = z.object({
  balanceId: z.string().min(1),
  toLocationId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const adjustStockSchema = z.object({
  balanceId: z.string().min(1),
  quantityDelta: z.number().int(),
  reason: z.string().min(3, "Reason is required for adjustments"),
});

export const upsertSkuSchema = z.object({
  id: z.string().optional(),
  skuCode: z.string().min(1).max(64),
  barcode: z.string().max(128).optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  category: z.string().max(128).optional().nullable(),
  uom: z.string().min(1).max(32).optional(),
  /** Use `setValueAs` on the number input so empty → `null` (not `NaN`) */
  reorderPoint: z.number().int().nonnegative().nullable().optional(),
  lotTracked: z.boolean().optional(),
  batchTracked: z.boolean().optional(),
  expiryTracked: z.boolean().optional(),
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type MoveStockInput = z.infer<typeof moveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpsertSkuInput = z.infer<typeof upsertSkuSchema>;
