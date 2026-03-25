"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireAuth } from "@/lib/auth/session";

const ProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  nickname: z.string().max(30).optional().transform((v) => v?.trim() || null),
});

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(_prev: ProfileResult | null, formData: FormData): Promise<ProfileResult> {
  const ctx = await requireAuth();

  const parsed = ProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      fullName: parsed.data.fullName,
      nickname: parsed.data.nickname,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function updateHiddenNav(hiddenPaths: string[]): Promise<ProfileResult> {
  const ctx = await requireAuth();

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { hiddenNavPaths: hiddenPaths },
  });

  revalidatePath("/");
  return { ok: true };
}
