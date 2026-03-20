import { InventoryBalanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { listInventoryBalances } from "@/features/inventory/service";
import { P } from "@/lib/auth/permissions";
import { canAccessWarehouse, getAuthContext } from "@/lib/auth/session";

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has(P.inventory.view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const statusRaw = searchParams.get("status");
  const status =
    statusRaw && Object.values(InventoryBalanceStatus).includes(statusRaw as InventoryBalanceStatus)
      ? (statusRaw as InventoryBalanceStatus)
      : undefined;
  const lowStockOnly = searchParams.get("lowStock") === "1";

  const requestedWarehouse = searchParams.get("warehouseId") ?? undefined;
  if (requestedWarehouse && !canAccessWarehouse(ctx, requestedWarehouse)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const warehouseId = requestedWarehouse ?? (ctx.roleNames.includes("admin") ? undefined : ctx.warehouseIds[0]);

  try {
    const rows = await listInventoryBalances({ search, warehouseId, category, status, lowStockOnly });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load inventory" },
      { status: 500 },
    );
  }
}
