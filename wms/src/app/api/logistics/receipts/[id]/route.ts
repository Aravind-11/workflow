import { NextResponse } from "next/server";
import { getReceipt } from "@/features/logistics/service";
import { P } from "@/lib/auth/permissions";
import { canAccessWarehouse, getAuthContext } from "@/lib/auth/session";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has(P.receiving.manage)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessWarehouse(ctx, receipt.warehouseId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(JSON.parse(JSON.stringify(receipt)));
}
