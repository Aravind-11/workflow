import { NextResponse } from "next/server";
import { WarehouseStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const email: string | undefined = body.email;
  const fullName: string | undefined = body.fullName;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (email !== user.email) {
    return NextResponse.json({ error: "Cannot provision a different user" }, { status: 403 });
  }

  const result = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName: fullName || email.split("@")[0] },
  });

  const hasRoles = await prisma.userRole.count({ where: { userId: result.id } });
  if (hasRoles === 0) {
    await assignDefaultViewerRole(result.id);
  }

  return NextResponse.json({ ok: true, userId: result.id });
}

async function assignDefaultViewerRole(userId: string) {
  const viewerRole = await prisma.role.findUnique({ where: { name: "viewer" } });
  if (!viewerRole) return;

  const warehouses = await prisma.warehouse.findMany({
    where: { status: WarehouseStatus.ACTIVE },
    select: { id: true },
  });
  if (warehouses.length === 0) return;

  await prisma.userRole.createMany({
    data: warehouses.map((w) => ({
      userId,
      roleId: viewerRole.id,
      warehouseId: w.id,
    })),
  });
}
