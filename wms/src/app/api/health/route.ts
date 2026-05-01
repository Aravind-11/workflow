import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return Response.json({
      status: "ok",
      db: "ok",
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    return Response.json(
      {
        status: "degraded",
        db: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
