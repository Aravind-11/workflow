import { prisma } from "@/server/db/prisma";

const EVENT_ENTITY_INCLUDES = {
  receipt: { select: { id: true, receiptNumber: true, status: true } },
  pickList: { select: { id: true, pickListNumber: true, status: true } },
  packList: { select: { id: true, packListNumber: true, status: true } },
  shipment: {
    select: {
      id: true,
      shipmentNumber: true,
      status: true,
      trackingNumber: true,
    },
  },
  task: { select: { id: true, title: true, status: true } },
  workerProfile: { select: { id: true, firstName: true, lastName: true } },
  location: {
    select: { id: true, locationCode: true, zone: true, aisle: true, rack: true, bin: true },
  },
} as const;

export async function lookupTrackingItem(barcode: string, maxRedirects = 5) {
  let currentBarcode = barcode;

  for (let i = 0; i < maxRedirects; i++) {
    const item = await prisma.trackingItem.findUnique({
      where: { barcode: currentBarcode },
      include: {
        project: { select: { code: true, name: true, customerName: true } },
        warehouse: { select: { code: true, name: true } },
        events: {
          orderBy: { timestamp: "asc" },
          include: EVENT_ENTITY_INCLUDES,
        },
      },
    });

    if (!item) return null;

    if (item.status === "REPLACED" && item.replacedByBarcode) {
      currentBarcode = item.replacedByBarcode;
      continue;
    }

    return item;
  }

  return null;
}

export async function lookupByEventBarcode(barcode: string) {
  const event = await prisma.trackingEvent.findUnique({
    where: { barcode },
    include: {
      trackingItem: {
        include: {
          project: { select: { code: true, name: true, customerName: true } },
          warehouse: { select: { code: true, name: true } },
          events: {
            orderBy: { timestamp: "asc" },
            include: EVENT_ENTITY_INCLUDES,
          },
        },
      },
    },
  });
  return event?.trackingItem ?? null;
}

export async function getTrackingTree(trackingItemId: string) {
  return prisma.trackingEvent.findMany({
    where: { trackingItemId },
    orderBy: { timestamp: "asc" },
    include: EVENT_ENTITY_INCLUDES,
  });
}

export async function getContainerContents(containerBarcode: string, warehouseId?: string) {
  const where: Record<string, unknown> = { containerBarcode };
  if (warehouseId) where.warehouseId = warehouseId;

  return prisma.trackingItem.findMany({
    where,
    select: {
      id: true,
      barcode: true,
      skuCode: true,
      description: true,
      containerType: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export interface JourneyEventWithDwell {
  event: Awaited<ReturnType<typeof getTrackingTree>>[number];
  dwellMs: number | null;
}

export async function getItemJourneyWithDwellTimes(
  barcode: string,
): Promise<JourneyEventWithDwell[] | null> {
  const item = await prisma.trackingItem.findUnique({
    where: { barcode },
    select: { id: true },
  });
  if (!item) return null;

  const events = await getTrackingTree(item.id);

  return events.map((evt, i) => ({
    event: evt,
    dwellMs:
      i < events.length - 1
        ? new Date(events[i + 1].timestamp).getTime() -
          new Date(evt.timestamp).getTime()
        : null,
  }));
}

export interface TrackingSearchFilters {
  warehouseId: string;
  projectId?: string;
  containerType?: string;
  stageType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  query?: string;
}

export async function searchTrackingItems(filters: TrackingSearchFilters) {
  const where: Record<string, unknown> = { warehouseId: filters.warehouseId };
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.containerType) where.containerType = filters.containerType;

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = filters.dateFrom;
    if (filters.dateTo) createdAt.lte = filters.dateTo;
    where.createdAt = createdAt;
  }

  if (filters.query) {
    where.OR = [
      { barcode: { contains: filters.query, mode: "insensitive" } },
      { skuCode: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { customerName: { contains: filters.query, mode: "insensitive" } },
    ];
  }

  return prisma.trackingItem.findMany({
    where,
    include: {
      project: { select: { code: true, name: true } },
      warehouse: { select: { code: true, name: true } },
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listTrackingItems(warehouseId: string, projectId?: string) {
  return prisma.trackingItem.findMany({
    where: {
      warehouseId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { code: true, name: true } },
      warehouse: { select: { code: true, name: true } },
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
