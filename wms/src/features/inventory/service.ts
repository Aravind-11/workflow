import {
  InventoryBalanceStatus,
  Prisma,
  WarehouseStatus,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type BalanceListFilters = {
  search?: string;
  warehouseId?: string;
  category?: string;
  status?: InventoryBalanceStatus;
  lowStockOnly?: boolean;
};

export async function getInventoryFilterOptions() {
  const [warehouses, categories] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: WarehouseStatus.ACTIVE },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { category: { not: null } },
    }),
  ]);

  const cats = categories
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c))
    .sort((a, b) => a.localeCompare(b));

  return { warehouses, categories: cats };
}

export async function listInventoryBalances(filters: BalanceListFilters) {
  const search = filters.search?.trim();

  const itemWhere: Prisma.InventoryItemWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(search
      ? {
          OR: [
            { skuCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const where: Prisma.InventoryBalanceWhereInput = {
    warehouseId: filters.warehouseId || undefined,
    status: filters.status,
    ...(Object.keys(itemWhere).length > 0 ? { inventoryItem: itemWhere } : {}),
  };

  const rows = await prisma.inventoryBalance.findMany({
    where,
    include: {
      inventoryItem: true,
      location: true,
      warehouse: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
  });

  const mapped = rows.map((row) => {
    const available = row.onHandQty - row.reservedQty;
    const reorder = row.inventoryItem.reorderPoint;
    const isLow =
      reorder != null && reorder > 0 ? available <= reorder : false;
    return { ...row, available, isLow };
  });

  if (filters.lowStockOnly) {
    return mapped.filter((r) => r.isLow);
  }
  return mapped;
}

export async function listInventoryItems(search?: string, category?: string) {
  return prisma.inventoryItem.findMany({
    where: {
      category: category || undefined,
      OR: search
        ? [
            { skuCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { skuCode: "asc" },
    take: 300,
  });
}

export async function getInventoryItemById(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      balances: {
        include: {
          location: true,
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      },
    },
  });
}

export async function listTransactionsForItem(
  inventoryItemId: string,
  take = 100,
) {
  return prisma.inventoryTransaction.findMany({
    where: { inventoryItemId },
    include: {
      location: { select: { locationCode: true, zone: true } },
      warehouse: { select: { code: true } },
    },
    orderBy: { occurredAt: "desc" },
    take,
  });
}

export async function getLocationsForWarehouse(warehouseId: string) {
  return prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId, isActive: true },
    orderBy: { locationCode: "asc" },
    select: { id: true, locationCode: true, zone: true, aisle: true, rack: true, bin: true },
  });
}

export async function getInventoryFormOptions() {
  const warehouses = await prisma.warehouse.findMany({
    where: { status: WarehouseStatus.ACTIVE },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
  const ids = warehouses.map((w) => w.id);
  const locs = await prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId: { in: ids }, isActive: true },
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      zone: true,
      aisle: true,
    },
    orderBy: { locationCode: "asc" },
  });
  const locationsByWarehouse = warehouses.reduce(
    (acc, w) => {
      acc[w.id] = locs.filter((l) => l.warehouseId === w.id);
      return acc;
    },
    {} as Record<string, typeof locs>,
  );
  return { warehouses, locationsByWarehouse };
}
