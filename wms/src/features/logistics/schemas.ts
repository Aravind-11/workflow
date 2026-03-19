import { z } from "zod";
import {
  DeliveryDirection,
  DeliveryStatus,
  InboundLineStatus,
  PickListStatus,
  ReceiptLineCondition,
  ReceiptStatus,
  ShipmentStatus,
} from "@prisma/client";

export const createReceiptSchema = z.object({
  warehouseId: z.string().min(1),
  purchaseOrderId: z.string().optional().nullable(),
  deliveryId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateReceiptSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(ReceiptStatus).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const receiptLineSchema = z.object({
  receiptId: z.string().min(1),
  purchaseOrderLineId: z.string().optional().nullable(),
  inventoryItemId: z.string().min(1),
  locationId: z.string().optional().nullable(),
  receivedQty: z.number().int().positive(),
  lotNumber: z.string().max(128).optional().nullable(),
  batchNumber: z.string().max(128).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  condition: z.nativeEnum(ReceiptLineCondition).optional(),
  inboundStatus: z.nativeEnum(InboundLineStatus).optional(),
});

export const updateReceiptLineSchema = z.object({
  id: z.string().min(1),
  receivedQty: z.number().int().positive().optional(),
  condition: z.nativeEnum(ReceiptLineCondition).optional(),
  inboundStatus: z.nativeEnum(InboundLineStatus).optional(),
  locationId: z.string().optional().nullable(),
  lotNumber: z.string().max(128).optional().nullable(),
  batchNumber: z.string().max(128).optional().nullable(),
});

export const createShipmentSchema = z.object({
  warehouseId: z.string().min(1),
  salesOrderRef: z.string().max(128).optional().nullable(),
  carrier: z.string().min(1).max(128),
  serviceLevel: z.string().max(64).optional().nullable(),
  trackingNumber: z.string().max(128).optional().nullable(),
  dockAppointmentId: z.string().optional().nullable(),
});

export const updateShipmentSchema = z.object({
  id: z.string().min(1),
  carrier: z.string().max(128).optional(),
  serviceLevel: z.string().max(64).optional().nullable(),
  trackingNumber: z.string().max(128).optional().nullable(),
  status: z.nativeEnum(ShipmentStatus).optional(),
  plannedShipAt: z.string().optional().nullable(),
});

export const shipmentLineSchema = z.object({
  shipmentId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  lotNumber: z.string().max(128).optional().nullable(),
  batchNumber: z.string().max(128).optional().nullable(),
});

export const createPickListSchema = z.object({
  warehouseId: z.string().min(1),
  shipmentId: z.string().min(1),
  scheduledDate: z.string().min(1),
  assignedWorkerId: z.string().optional().nullable(),
});

export const pickLineUpdateSchema = z.object({
  lineId: z.string().min(1),
  pickedQty: z.number().int().min(0),
  status: z.nativeEnum(PickListStatus).optional(),
});

export const createPackListSchema = z.object({
  warehouseId: z.string().min(1),
  shipmentId: z.string().min(1),
  assignedWorkerId: z.string().optional().nullable(),
});

export const packLineUpdateSchema = z.object({
  lineId: z.string().min(1),
  packedQty: z.number().int().min(0),
});

export const createDeliverySchema = z.object({
  warehouseId: z.string().min(1),
  dockAppointmentId: z.string().optional().nullable(),
  direction: z.nativeEnum(DeliveryDirection),
  carrier: z.string().min(1).max(128),
  scheduledAt: z.string().min(1),
});

export const updateDeliverySchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(DeliveryStatus).optional(),
  arrivedAt: z.string().optional().nullable(),
  releasedAt: z.string().optional().nullable(),
});

export const dockAppointmentSchema = z.object({
  warehouseId: z.string().min(1),
  appointmentCode: z.string().min(1).max(64),
  carrier: z.string().min(1).max(128),
  dockDoor: z.string().min(1).max(32),
  scheduledStart: z.string().min(1),
  scheduledEnd: z.string().min(1),
});

export const dockCheckInSchema = z.object({
  id: z.string().min(1),
});
