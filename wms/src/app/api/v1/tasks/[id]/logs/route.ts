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

  const logs = await prisma.taskLog.findMany({
    where: { taskId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ logs });
}
