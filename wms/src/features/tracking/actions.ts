"use server";

import { prisma } from "@/server/db/prisma";
import type { ActionResult } from "@/lib/types";
import { generateItemBarcode, generateEventBarcode } from "@/features/tracking/barcode-utils";
import { assertWarehouseOwnership } from "@/features/tracking/guards";

interface EntityLinks {
  receiptId?: string;
  pickListId?: string;
  packListId?: string;
  shipmentId?: string;
  taskId?: string;
  workerProfileId?: string;
  locationId?: string;
}

interface CreateTrackingItemInput extends EntityLinks {
  warehouseId: string;
  warehouseCode: string;
  projectCode?: string;
  projectId?: string;
  skuCode: string;
  description?: string;
  customerName?: string;
  providerName?: string;
  containerType?: string;
  containerBarcode?: string;
  handledBy?: string;
  locationCode?: string;
  warehouseZone?: string;
  stagePrefix?: string;
}

export async function createTrackingItemWithReceiveEvent(
  input: CreateTrackingItemInput,
): Promise<ActionResult<{ trackingItemId: string; itemBarcode: string; eventBarcode: string }>> {
  const itemBarcode = generateItemBarcode(input.warehouseCode, input.projectCode);
  const stageTag = input.stagePrefix || "RECV";
  const eventBarcode = generateEventBarcode(itemBarcode, stageTag);

  const item = await prisma.trackingItem.create({
    data: {
      barcode: itemBarcode,
      warehouseId: input.warehouseId,
      projectId: input.projectId ?? null,
      skuCode: input.skuCode,
      description: input.description,
      customerName: input.customerName,
      providerName: input.providerName,
      containerType: input.containerType ?? null,
      containerBarcode: input.containerBarcode ?? null,
    },
  });

  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: "receive",
      stageLabel: "Received",
      barcode: eventBarcode,
      handledBy: input.handledBy,
      locationCode: input.locationCode,
      warehouseZone: input.warehouseZone,
      receiptId: input.receiptId ?? null,
      pickListId: input.pickListId ?? null,
      packListId: input.packListId ?? null,
      shipmentId: input.shipmentId ?? null,
      taskId: input.taskId ?? null,
      workerProfileId: input.workerProfileId ?? null,
      locationId: input.locationId ?? null,
    },
  });

  return { ok: true, data: { trackingItemId: item.id, itemBarcode, eventBarcode } };
}

interface AddTrackingEventInput extends EntityLinks {
  trackingItemId: string;
  warehouseId: string;
  parentEventId?: string;
  stageType: string;
  stageLabel: string;
  itemBarcode: string;
  stagePrefix?: string;
  handledBy?: string;
  locationCode?: string;
  warehouseZone?: string;
  notes?: string;
}

export async function addTrackingEvent(
  input: AddTrackingEventInput,
): Promise<ActionResult<{ eventId: string; eventBarcode: string }>> {
  const ownerCheck = await assertWarehouseOwnership(input.trackingItemId, input.warehouseId);
  if (!ownerCheck.ok) return ownerCheck;

  const stageTag = input.stagePrefix || input.stageType.toUpperCase().slice(0, 4);
  const eventBarcode = generateEventBarcode(input.itemBarcode, stageTag);

  const event = await prisma.trackingEvent.create({
    data: {
      trackingItemId: input.trackingItemId,
      parentEventId: input.parentEventId,
      stageType: input.stageType,
      stageLabel: input.stageLabel,
      barcode: eventBarcode,
      handledBy: input.handledBy,
      locationCode: input.locationCode,
      warehouseZone: input.warehouseZone,
      notes: input.notes,
      receiptId: input.receiptId ?? null,
      pickListId: input.pickListId ?? null,
      packListId: input.packListId ?? null,
      shipmentId: input.shipmentId ?? null,
      taskId: input.taskId ?? null,
      workerProfileId: input.workerProfileId ?? null,
      locationId: input.locationId ?? null,
    },
  });

  return { ok: true, data: { eventId: event.id, eventBarcode: event.barcode } };
}

export async function createWorkflowStageTrackingEvent(input: {
  warehouseId: string;
  warehouseCode: string;
  projectId?: string;
  projectCode?: string;
  stageId: string;
  stageLabel: string;
  stageType: string;
  stagePrefix: string;
  itemId?: string;
  skuCode: string;
  description?: string;
  customerName?: string;
  providerName?: string;
  handledBy?: string;
  locationCode?: string;
  warehouseZone?: string;
  notes?: string;
} & EntityLinks): Promise<ActionResult<{ trackingItemId: string; itemBarcode: string; eventBarcode: string }>> {
  let trackingItem;

  if (input.itemId) {
    trackingItem = await prisma.trackingItem.findUnique({ where: { id: input.itemId } });
    if (trackingItem && trackingItem.warehouseId !== input.warehouseId) {
      return { ok: false, error: "Item does not belong to this warehouse" };
    }
  }

  if (!trackingItem) {
    const itemBarcode = generateItemBarcode(input.warehouseCode, input.projectCode);
    trackingItem = await prisma.trackingItem.create({
      data: {
        barcode: itemBarcode,
        warehouseId: input.warehouseId,
        projectId: input.projectId ?? null,
        skuCode: input.skuCode,
        description: input.description,
        customerName: input.customerName,
        providerName: input.providerName,
      },
    });
  }

  const stageTag = input.stagePrefix || input.stageType.toUpperCase().slice(0, 4);
  const eventBarcode = generateEventBarcode(trackingItem.barcode, stageTag);

  const lastEvent = await prisma.trackingEvent.findFirst({
    where: { trackingItemId: trackingItem.id },
    orderBy: { timestamp: "desc" },
    select: { id: true },
  });

  const event = await prisma.trackingEvent.create({
    data: {
      trackingItemId: trackingItem.id,
      parentEventId: lastEvent?.id ?? null,
      stageType: input.stageType,
      stageLabel: input.stageLabel,
      barcode: eventBarcode,
      handledBy: input.handledBy,
      locationCode: input.locationCode,
      warehouseZone: input.warehouseZone,
      notes: input.notes ?? `Processed at ${input.stageLabel} stage`,
      receiptId: input.receiptId ?? null,
      pickListId: input.pickListId ?? null,
      packListId: input.packListId ?? null,
      shipmentId: input.shipmentId ?? null,
      taskId: input.taskId ?? null,
      workerProfileId: input.workerProfileId ?? null,
      locationId: input.locationId ?? null,
    },
  });

  return {
    ok: true,
    data: {
      trackingItemId: trackingItem.id,
      itemBarcode: trackingItem.barcode,
      eventBarcode: event.barcode,
    },
  };
}

export async function registerStageBarcodeAction(input: {
  warehouseId: string;
  projectId?: string;
  stageId: string;
  stageLabel: string;
  stageType: string;
  barcodePrefix: string;
  barcode: string;
}): Promise<ActionResult<{ trackingItemId: string; barcode: string }>> {
  const existing = await prisma.trackingItem.findFirst({
    where: { barcode: input.barcode, warehouseId: input.warehouseId },
  });
  if (existing) {
    return { ok: true, data: { trackingItemId: existing.id, barcode: existing.barcode } };
  }

  const item = await prisma.trackingItem.create({
    data: {
      barcode: input.barcode,
      warehouseId: input.warehouseId,
      projectId: input.projectId ?? null,
      skuCode: `STAGE-${input.barcodePrefix}`,
      description: `Workflow stage: ${input.stageLabel} (${input.stageType})`,
      customerName: null,
      providerName: null,
    },
  });

  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: input.stageType,
      stageLabel: input.stageLabel,
      barcode: `${input.barcode}-INIT`,
      handledBy: null,
      locationCode: null,
      warehouseZone: null,
      notes: `Barcode registered for ${input.stageLabel} stage in workflow designer`,
    },
  });

  return { ok: true, data: { trackingItemId: item.id, barcode: item.barcode } };
}

// ─── Barcode Lifecycle ──────────────────────────────────────────────────────

export async function voidTrackingItem(
  barcode: string,
  warehouseId: string,
  reason?: string,
): Promise<ActionResult> {
  const item = await prisma.trackingItem.findUnique({ where: { barcode } });
  if (!item) return { ok: false, error: "Item not found" };
  if (item.warehouseId !== warehouseId) return { ok: false, error: "Item does not belong to this warehouse" };
  if (item.status === "VOIDED") return { ok: false, error: "Item is already voided" };

  await prisma.trackingItem.update({
    where: { id: item.id },
    data: { status: "VOIDED" },
  });

  const eventBarcode = generateEventBarcode(barcode, "VOID");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: "void",
      stageLabel: "Voided",
      barcode: eventBarcode,
      notes: reason ?? "Barcode voided",
    },
  });

  return { ok: true };
}

export async function relabelTrackingItem(
  oldBarcode: string,
  warehouseId: string,
  warehouseCode: string,
  projectCode?: string,
): Promise<ActionResult<{ newBarcode: string }>> {
  const oldItem = await prisma.trackingItem.findUnique({
    where: { barcode: oldBarcode },
    include: { events: { orderBy: { timestamp: "asc" } } },
  });
  if (!oldItem) return { ok: false, error: "Item not found" };
  if (oldItem.warehouseId !== warehouseId) return { ok: false, error: "Item does not belong to this warehouse" };
  if (oldItem.status === "VOIDED") return { ok: false, error: "Cannot relabel a voided item" };

  const newBarcode = generateItemBarcode(warehouseCode, projectCode);

  const newItem = await prisma.trackingItem.create({
    data: {
      barcode: newBarcode,
      warehouseId: oldItem.warehouseId,
      projectId: oldItem.projectId,
      skuCode: oldItem.skuCode,
      description: oldItem.description,
      customerName: oldItem.customerName,
      providerName: oldItem.providerName,
      containerType: oldItem.containerType,
      containerBarcode: oldItem.containerBarcode,
      manifestJson: oldItem.manifestJson ?? undefined,
    },
  });

  await prisma.trackingItem.update({
    where: { id: oldItem.id },
    data: { status: "REPLACED", replacedByBarcode: newBarcode },
  });

  const voidEventBarcode = generateEventBarcode(oldBarcode, "REPL");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: oldItem.id,
      stageType: "replace",
      stageLabel: "Replaced",
      barcode: voidEventBarcode,
      notes: `Replaced by ${newBarcode}`,
    },
  });

  const initEventBarcode = generateEventBarcode(newBarcode, "INIT");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: newItem.id,
      stageType: "relabel",
      stageLabel: "Relabeled",
      barcode: initEventBarcode,
      notes: `Continuation of ${oldBarcode}`,
    },
  });

  return { ok: true, data: { newBarcode } };
}
