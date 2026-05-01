import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { prisma } from "@/server/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { barcode } = await params;

  const item = await prisma.trackingItem.findFirst({
    where: { barcode },
    include: {
      events: {
        orderBy: { timestamp: "asc" },
        include: {
          location: {
            select: { locationCode: true, zone: true, aisle: true },
          },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: item.id,
    barcode: item.barcode,
    skuCode: item.skuCode,
    warehouseId: item.warehouseId,
    projectId: item.projectId,
    status: item.status,
    events: item.events.map((e) => ({
      id: e.id,
      stageType: e.stageType,
      stageLabel: e.stageLabel,
      eventBarcode: e.barcode,
      handledBy: e.handledBy,
      location: e.location,
      timestamp: e.timestamp,
    })),
  });
}
