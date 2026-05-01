"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { ActionResult } from "@/lib/types";
import { generateItemBarcode, generateEventBarcode } from "./barcode-utils";
import { assertBarcodeWarehouseOwnership } from "./guards";

type ContainerType = "BOX" | "PALLET" | "CARTON";

interface CreateContainerInput {
  warehouseId: string;
  warehouseCode: string;
  projectId?: string;
  projectCode?: string;
  containerType: ContainerType;
  skuCode?: string;
  description?: string;
  customerName?: string;
  parentContainerBarcode?: string;
  manifestData?: Record<string, unknown>;
}

export async function createContainer(
  input: CreateContainerInput,
): Promise<ActionResult<{ id: string; barcode: string }>> {
  const barcode = generateItemBarcode(input.warehouseCode, input.projectCode);

  const item = await prisma.trackingItem.create({
    data: {
      barcode,
      warehouseId: input.warehouseId,
      projectId: input.projectId ?? null,
      skuCode: input.skuCode ?? `${input.containerType}-${barcode.slice(-5)}`,
      description: input.description ?? `${input.containerType} container`,
      customerName: input.customerName ?? null,
      containerType: input.containerType,
      containerBarcode: input.parentContainerBarcode ?? null,
      manifestJson: (input.manifestData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });

  const eventBarcode = generateEventBarcode(barcode, "INIT");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: "create",
      stageLabel: "Container Created",
      barcode: eventBarcode,
      notes: `${input.containerType} container created`,
    },
  });

  return { ok: true, data: { id: item.id, barcode } };
}

export async function attachToContainer(
  itemBarcode: string,
  containerBarcode: string,
  warehouseId: string,
): Promise<ActionResult> {
  const [itemCheck, containerCheck] = await Promise.all([
    assertBarcodeWarehouseOwnership(itemBarcode, warehouseId),
    assertBarcodeWarehouseOwnership(containerBarcode, warehouseId),
  ]);
  if (!itemCheck.ok) return { ok: false, error: `Item: ${itemCheck.error}` };
  if (!containerCheck.ok) return { ok: false, error: `Container: ${containerCheck.error}` };

  const [item, container] = await Promise.all([
    prisma.trackingItem.findUnique({ where: { barcode: itemBarcode } }),
    prisma.trackingItem.findUnique({ where: { barcode: containerBarcode } }),
  ]);

  if (!item) return { ok: false, error: "Item not found" };
  if (!container) return { ok: false, error: "Container not found" };
  if (!container.containerType) return { ok: false, error: "Target is not a container" };

  await prisma.trackingItem.update({
    where: { id: item.id },
    data: { containerBarcode },
  });

  const eventBarcode = generateEventBarcode(item.barcode, "ATTC");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: "attach",
      stageLabel: `Attached to ${container.containerType}`,
      barcode: eventBarcode,
      notes: `Linked to container ${containerBarcode}`,
    },
  });

  return { ok: true };
}

export async function detachFromContainer(
  itemBarcode: string,
  warehouseId: string,
): Promise<ActionResult> {
  const ownerCheck = await assertBarcodeWarehouseOwnership(itemBarcode, warehouseId);
  if (!ownerCheck.ok) return ownerCheck;

  const item = await prisma.trackingItem.findUnique({ where: { barcode: itemBarcode } });
  if (!item) return { ok: false, error: "Item not found" };
  if (!item.containerBarcode) return { ok: false, error: "Item is not in a container" };

  const prevContainer = item.containerBarcode;
  await prisma.trackingItem.update({
    where: { id: item.id },
    data: { containerBarcode: null },
  });

  const eventBarcode = generateEventBarcode(item.barcode, "DETC");
  await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType: "detach",
      stageLabel: "Detached from container",
      barcode: eventBarcode,
      notes: `Removed from container ${prevContainer}`,
    },
  });

  return { ok: true };
}

export async function attachManifest(
  barcode: string,
  manifestData: Record<string, unknown>,
  warehouseId: string,
): Promise<ActionResult> {
  const ownerCheck = await assertBarcodeWarehouseOwnership(barcode, warehouseId);
  if (!ownerCheck.ok) return ownerCheck;

  const item = await prisma.trackingItem.findUnique({ where: { barcode } });
  if (!item) return { ok: false, error: "Item not found" };

  await prisma.trackingItem.update({
    where: { id: item.id },
    data: { manifestJson: manifestData as Prisma.InputJsonValue },
  });

  return { ok: true };
}

export async function getContainerContents(
  containerBarcode: string,
  warehouseId?: string,
): Promise<ActionResult<{ container: { id: string; barcode: string; containerType: string | null; manifestJson: unknown }; items: { id: string; barcode: string; skuCode: string; description: string | null; containerType: string | null }[] }>> {
  const container = await prisma.trackingItem.findUnique({
    where: { barcode: containerBarcode },
  });
  if (!container) return { ok: false, error: "Container not found" };
  if (warehouseId && container.warehouseId !== warehouseId) {
    return { ok: false, error: "Container does not belong to this warehouse" };
  }

  const itemWhere: Record<string, unknown> = { containerBarcode };
  if (warehouseId) itemWhere.warehouseId = warehouseId;

  const items = await prisma.trackingItem.findMany({
    where: itemWhere,
    select: {
      id: true,
      barcode: true,
      skuCode: true,
      description: true,
      containerType: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    ok: true,
    data: {
      container: {
        id: container.id,
        barcode: container.barcode,
        containerType: container.containerType,
        manifestJson: container.manifestJson,
      },
      items,
    },
  };
}
