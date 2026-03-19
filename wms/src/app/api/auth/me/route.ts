import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";

/** Client-friendly session payload for permission-aware UI. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: ctx.userId,
      email: ctx.email,
      fullName: ctx.fullName,
      roleNames: ctx.roleNames,
      permissions: [...ctx.permissions],
    },
  });
}
