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

  const locations = await prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId: id, isActive: true },
    select: {
      id: true,
      locationCode: true,
      zone: true,
      aisle: true,
      rack: true,
      bin: true,
      isActive: true,
    },
    orderBy: { locationCode: "asc" },
  });

  return NextResponse.json({ locations });
}
