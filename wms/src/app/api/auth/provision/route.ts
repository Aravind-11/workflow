import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const email: string | undefined = body.email;
  const fullName: string | undefined = body.fullName;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const warehouses = await prisma.warehouse.findMany({ select: { id: true } });

  const user = await prisma.user.create({
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

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
