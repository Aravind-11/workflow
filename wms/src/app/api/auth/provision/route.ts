import { NextResponse } from "next/server";
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const warehouses = await prisma.warehouse.findMany({ select: { id: true } });

  const created = await prisma.user.create({
    data: {
      email,
      fullName: fullName || email.split("@")[0],
      ...(adminRole && warehouses.length > 0
        ? {
            roleMappings: {
              create: warehouses.map((w) => ({
                roleId: adminRole.id,
                warehouseId: w.id,
              })),
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, userId: created.id }, { status: 201 });
}
