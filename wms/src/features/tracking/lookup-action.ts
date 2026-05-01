"use server";

import { lookupTrackingItem, lookupByEventBarcode, getContainerContents } from "./service";
import { serialize } from "@/lib/utils";

export async function lookupBarcode(barcode: string, warehouseId?: string) {
  let item = await lookupTrackingItem(barcode);
  if (!item) {
    item = await lookupByEventBarcode(barcode);
  }
  if (!item) return null;

  if (warehouseId && item.warehouseId !== warehouseId) {
    return { _warehouseMismatch: true as const, warehouseCode: item.warehouse.code };
  }

  let containedItems: Awaited<ReturnType<typeof getContainerContents>> = [];
  if (item.containerType) {
    containedItems = await getContainerContents(item.barcode, warehouseId ?? item.warehouseId);
  }

  return serialize({ ...item, containedItems });
}
