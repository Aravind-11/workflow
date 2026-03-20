import { NextResponse } from "next/server";
import { WorkerStatus } from "@prisma/client";
import { listWorkers } from "@/features/workers/service";
import { P } from "@/lib/auth/permissions";
import { canAccessWarehouse, getAuthContext } from "@/lib/auth/session";

function parseStatus(raw: string | null): WorkerStatus | undefined {
  if (!raw) return undefined;
  return Object.values(WorkerStatus).includes(raw as WorkerStatus)
    ? (raw as WorkerStatus)
    : undefined;
}

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has(P.workers.manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const status = parseStatus(searchParams.get("status"));

  const requestedWarehouse = searchParams.get("warehouseId") ?? undefined;
  if (requestedWarehouse && !canAccessWarehouse(ctx, requestedWarehouse)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const warehouseId = requestedWarehouse ?? (ctx.roleNames.includes("admin") ? undefined : ctx.warehouseIds[0]);

  try {
    const workers = await listWorkers({ search, warehouseId, status });
    return NextResponse.json(workers);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load workers" },
      { status: 500 },
    );
  }
}
