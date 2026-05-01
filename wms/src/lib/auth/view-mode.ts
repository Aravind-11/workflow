import "server-only";

import { cookies } from "next/headers";

/**
 * "admin"    — see everything across all warehouses (cross-warehouse view)
 * "operator" — scoped to a single selected warehouse (the floor view)
 *
 * Stored in a cookie so it survives reloads. Anyone can pick admin, even
 * an admin can deliberately switch into operator view to validate what
 * a single floor looks like.
 */
const COOKIE = "nventr_view_mode";
const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export type ViewMode = "admin" | "operator";

export async function getViewMode(): Promise<ViewMode | null> {
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  if (v === "admin" || v === "operator") return v;
  return null;
}

export async function setViewMode(mode: ViewMode): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, mode, COOKIE_OPTS);
}

export async function clearViewMode(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
