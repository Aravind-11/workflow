import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 },
    );
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ notifications });
}
