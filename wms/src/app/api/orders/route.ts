import { NextResponse } from "next/server";
import { P } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has(P.dashboard.view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = ctx.roleNames.includes("admin")
    ? {}
    : { warehouseId: { in: ctx.warehouseIds } };

  const shipments = await prisma.shipment.findMany({
    where,
    select: {
      id: true,
      shipmentNumber: true,
      salesOrderRef: true,
      status: true,
      carrier: true,
      trackingNumber: true,
      plannedShipAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(JSON.parse(JSON.stringify(shipments)));
}
