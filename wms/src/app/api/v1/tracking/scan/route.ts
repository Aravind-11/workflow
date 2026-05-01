import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { prisma } from "@/server/db/prisma";
import { generateEventBarcode } from "@/features/tracking/barcode-utils";

export async function POST(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const { barcode, stageType, stageLabel, handledBy, locationCode, notes } = body;

  if (!barcode || !stageType) {
    return NextResponse.json(
      { error: "barcode and stageType are required" },
      { status: 400 },
    );
  }

  const item = await prisma.trackingItem.findFirst({
    where: { barcode },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const eventBarcode = generateEventBarcode(barcode, stageType.toUpperCase().slice(0, 4));

  const event = await prisma.trackingEvent.create({
    data: {
      trackingItemId: item.id,
      stageType,
      stageLabel: stageLabel ?? stageType,
      barcode: eventBarcode,
      handledBy: handledBy ?? null,
      locationCode: locationCode ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({
    eventId: event.id,
    eventBarcode: event.barcode,
    trackingItemId: item.id,
  });
}
