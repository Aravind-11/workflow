import { z } from "zod";
import { ReturnDisposition, ReturnStatus } from "@prisma/client";

export const EXCEPTION_REASON_CODES = [
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "WRONG_ITEM",
  "CUSTOMER_REGRET",
  "CARRIER_LOSS",
  "QUALITY",
  "OTHER",
] as const;

export const createRmaSchema = z.object({
  warehouseId: z.string().min(1),
  customerName: z.string().min(1).max(255),
  reason: z.string().max(2000).optional().nullable(),
  shipmentId: z.string().optional().nullable(),
  originalOrderRef: z.string().max(128).optional().nullable(),
  exceptionReasonCode: z.string().max(64).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export const updateRmaStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(ReturnStatus),
  receivedAt: z.string().optional().nullable(),
  closedAt: z.string().optional().nullable(),
});

export const addReturnLineSchema = z.object({
  returnRmaId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  lotNumber: z.string().max(128).optional().nullable(),
  batchNumber: z.string().max(128).optional().nullable(),
});

export const updateLineReceiveSchema = z.object({
  lineId: z.string().min(1),
  receivedQty: z.number().int().min(0),
});

export const setDispositionSchema = z.object({
  lineId: z.string().min(1),
  dispositionType: z.nativeEnum(ReturnDisposition),
  dispositionNote: z.string().max(2000).optional().nullable(),
  restockLocationId: z.string().optional().nullable(),
});

export const applyInventorySchema = z.object({
  lineId: z.string().min(1),
});

export const addCommentSchema = z.object({
  returnRmaId: z.string().min(1),
  body: z.string().min(1).max(8000),
  isInternal: z.boolean().optional(),
  userId: z.string().optional().nullable(),
});

export const updateRmaNotesSchema = z.object({
  id: z.string().min(1),
  notes: z.string().max(4000).optional().nullable(),
});
