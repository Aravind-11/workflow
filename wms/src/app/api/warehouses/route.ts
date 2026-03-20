import { NextResponse } from "next/server";
import { P } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has(P.warehouses.view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = ctx.roleNames.includes("admin")
    ? {}
    : { id: { in: ctx.warehouseIds } };

  try {
    const data = await prisma.warehouse.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json(JSON.parse(JSON.stringify(data)));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load warehouses" },
      { status: 500 },
    );
  }
}
