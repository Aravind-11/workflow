"use server";

import { UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import { prisma } from "@/server/db/prisma";

import type { ActionResult as AdminActionResult } from "@/lib/types";

export type { AdminActionResult };

const assignSchema = z.object({
  userId: z.string().min(1),
  warehouseId: z.string().min(1),
  roleName: z.enum([
    "admin",
    "warehouse_manager",
    "supervisor",
    "picker",
    "packer",
    "receiver",
    "dispatcher",
    "viewer",
  ]),
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
});

export async function assignUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const g = await guardAction(P.admin.users);
  if (!g.ok) return { ok: false, error: g.error };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment" };
  const { userId, warehouseId, roleName } = parsed.data;

  const [user, wh, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    prisma.role.findUnique({ where: { name: roleName } }),
  ]);
  if (!user || !wh || !role) return { ok: false, error: "User, warehouse, or role not found" };

  await prisma.userRole.upsert({
    where: {
      userId_roleId_warehouseId: {
        userId,
        roleId: role.id,
        warehouseId,
      },
    },
    create: { userId, roleId: role.id, warehouseId },
    update: {},
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

const removeSchema = z.object({
  assignmentId: z.string().min(1),
});

export async function removeUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const g = await guardAction(P.admin.users);
  if (!g.ok) return { ok: false, error: g.error };
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  await prisma.userRole.delete({ where: { id: parsed.data.assignmentId } }).catch(() => null);
  revalidatePath("/admin/users");
  return { ok: true };
}

const statusSchema = z.object({
  userId: z.string().min(1),
  status: z.nativeEnum(UserStatus),
});

export async function setUserStatusAction(input: unknown): Promise<AdminActionResult> {
  const g = await guardAction(P.admin.users);
  if (!g.ok) return { ok: false, error: g.error };
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { status: parsed.data.status },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function createUserAction(input: unknown): Promise<AdminActionResult<{ id: string }>> {
  const g = await guardAction(P.admin.users);
  if (!g.ok) return { ok: false, error: g.error };
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid user data" };
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { ok: false, error: "Email already exists" };
  const u = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase().trim(),
      fullName: parsed.data.fullName.trim(),
      status: UserStatus.ACTIVE,
    },
  });
  revalidatePath("/admin/users");
  return { ok: true, data: { id: u.id } };
}
