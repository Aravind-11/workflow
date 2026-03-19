import "server-only";

import type { AuthContext } from "./session";
import { canAccessWarehouse, getAuthContext } from "./session";

type GuardFail = { ok: false; error: string };

/**
 * Authorize a server action. Returns a failed `{ ok: false, error }` when forbidden.
 * Pass `warehouseId` when the operation is scoped to a single warehouse.
 */
export async function guardAction(
  permission: string,
  warehouseId?: string | null,
): Promise<{ ok: true; ctx: AuthContext } | GuardFail> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "Sign in required" };
  if (!ctx.permissions.has(permission)) return { ok: false, error: "Forbidden" };
  if (warehouseId && !canAccessWarehouse(ctx, warehouseId)) {
    return { ok: false, error: "Forbidden" };
  }
  return { ok: true, ctx };
}
