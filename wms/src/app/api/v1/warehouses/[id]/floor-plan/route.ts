import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { prisma } from "@/server/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const floorPlan = await prisma.floorPlan.findUnique({
    where: { warehouseId: id },
  });

  if (!floorPlan) {
    return NextResponse.json({ error: "Floor plan not found" }, { status: 404 });
  }

  return NextResponse.json({
    warehouseId: id,
    imageData: floorPlan.imageData,
    zones: floorPlan.zones,
    arrows: floorPlan.arrows,
    updatedAt: floorPlan.updatedAt,
  });
}
