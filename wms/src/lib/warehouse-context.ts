import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { getViewMode } from "@/lib/auth/view-mode";

const WH_COOKIE = "nventr_warehouse_id";
const PROJ_COOKIE = "nventr_project_id";

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export async function getSelectedWarehouseId(): Promise<string | null> {
  const jar = await cookies();
  const stored = jar.get(WH_COOKIE)?.value ?? null;

  if (stored) {
    const exists = await prisma.warehouse.findUnique({
      where: { id: stored },
      select: { id: true },
    });
    if (exists) return stored;
  }

  const first = await prisma.warehouse.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" },
    select: { id: true },
  });

  return first?.id ?? null;
}

export async function setSelectedWarehouseId(warehouseId: string) {
  const jar = await cookies();
  jar.set(WH_COOKIE, warehouseId, COOKIE_OPTS);
  jar.delete(PROJ_COOKIE);
}

export async function getSelectedProjectId(): Promise<string | null> {
  const jar = await cookies();
  const stored = jar.get(PROJ_COOKIE)?.value ?? null;
  if (!stored) return null;

  const exists = await prisma.project.findUnique({
    where: { id: stored },
    select: { id: true },
  });
  return exists ? stored : null;
}

export async function setSelectedProjectId(projectId: string | null) {
  const jar = await cookies();
  if (projectId) {
    jar.set(PROJ_COOKIE, projectId, COOKIE_OPTS);
  } else {
    jar.delete(PROJ_COOKIE);
  }
}

/**
 * Resolve the effective warehouse scope for a request.
 *
 * Pages typically accept an optional `?warehouseId=` search param so admins
 * can pivot between warehouses without changing their cookie. In operator
 * mode that flexibility is wrong: the user is locked to a single warehouse
 * (chosen on /start/operator), so we must IGNORE the search param and
 * always return the cookie value. Otherwise an operator can poke another
 * warehouse's data into the page just by editing the URL bar.
 *
 * Returns:
 *   - `id`              effective warehouse to use for queries (null if none)
 *   - `locked`          true when in operator mode (UI should hide pickers)
 *   - `requestedId`     the raw search-param value (or null)
 *   - `selectedId`      the cookie value (or null)
 *
 * Use the returned `id` for ALL data queries on the page. Use `locked`
 * to decide whether to render warehouse-picker UI affordances.
 */
export async function resolveWarehouseScope(
  requestedId?: string | null,
): Promise<{
  id: string | null;
  locked: boolean;
  requestedId: string | null;
  selectedId: string | null;
}> {
  const [mode, selectedId] = await Promise.all([
    getViewMode(),
    getSelectedWarehouseId(),
  ]);
  const requested = requestedId ?? null;

  if (mode === "operator") {
    return {
      id: selectedId,
      locked: true,
      requestedId: requested,
      selectedId,
    };
  }
  return {
    id: requested ?? selectedId,
    locked: false,
    requestedId: requested,
    selectedId,
  };
}
