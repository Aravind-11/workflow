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

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      workerProfile: { select: { firstName: true, lastName: true } },
      location: { select: { locationCode: true, zone: true, aisle: true } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.status === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ task: updated });
}
