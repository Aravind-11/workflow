import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { P } from "@/lib/auth/permissions";
import { getAuthContext } from "@/lib/auth/session";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has(P.dashboard.view)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_orders")
    .select("id,order_number,customer_name,status,ship_by_date,carrier,tracking")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
