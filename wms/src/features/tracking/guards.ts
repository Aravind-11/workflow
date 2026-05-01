import { prisma } from "@/server/db/prisma";

export async function assertWarehouseOwnership(
  trackingItemId: string,
  expectedWarehouseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await prisma.trackingItem.findUnique({
    where: { id: trackingItemId },
    select: { warehouseId: true },
  });
  if (!item) return { ok: false, error: "Tracking item not found" };
  if (item.warehouseId !== expectedWarehouseId) {
    return { ok: false, error: "Item does not belong to this warehouse" };
  }
  return { ok: true };
}

export async function assertBarcodeWarehouseOwnership(
  barcode: string,
  expectedWarehouseId: string,
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const item = await prisma.trackingItem.findUnique({
    where: { barcode },
    select: { id: true, warehouseId: true },
  });
  if (!item) return { ok: false, error: "Tracking item not found" };
  if (item.warehouseId !== expectedWarehouseId) {
    return { ok: false, error: "Item does not belong to this warehouse" };
  }
  return { ok: true, itemId: item.id };
}
