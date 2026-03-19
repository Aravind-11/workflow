import { z } from "zod";

export const warehouseFilterSchema = z.object({
  country: z.string().trim().optional().default(""),
  state: z.string().trim().optional().default(""),
  region: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  search: z.string().trim().optional().default(""),
});

export type WarehouseFilterInput = z.infer<typeof warehouseFilterSchema>;

export function normalizeFilterValue(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return undefined;
  return trimmed;
}
