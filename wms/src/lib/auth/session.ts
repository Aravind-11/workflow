import "server-only";

import { UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/server/db/prisma";
import { mergePermissions } from "./permissions";

export type AuthContext = {
  userId: string;
  email: string;
  fullName: string;
  nickname: string | null;
  /** Nav paths the user chose to hide */
  hiddenNavPaths: string[];
  /** Distinct role names across all warehouse assignments */
  roleNames: string[];
  /** Effective permissions (union) */
  permissions: Set<string>;
  /** Warehouses this user is explicitly assigned to */
  warehouseIds: string[];
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: {
      roleMappings: {
        include: {
          role: { select: { name: true } },
        },
      },
    },
  });

  if (!dbUser || dbUser.status !== UserStatus.ACTIVE) return null;

  const roleNames = [...new Set(dbUser.roleMappings.map((m) => m.role.name))];
  const permissions = mergePermissions(roleNames);
  const warehouseIds = [...new Set(dbUser.roleMappings.map((m) => m.warehouseId))];

  return {
    userId: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    nickname: dbUser.nickname ?? null,
    hiddenNavPaths: dbUser.hiddenNavPaths ?? [],
    roleNames,
    permissions,
    warehouseIds,
  };
}

export function canAccessWarehouse(ctx: AuthContext, warehouseId: string): boolean {
  if (ctx.roleNames.includes("admin")) return true;
  return ctx.warehouseIds.includes(warehouseId);
}

/** Server Components / layouts: require login + permission or redirect. */
export async function requirePermission(permission: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/auth");
  if (!ctx.permissions.has(permission)) redirect("/unauthorized");
  return ctx;
}

/** Server Components: any authenticated user with a valid profile. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/auth");
  return ctx;
}
