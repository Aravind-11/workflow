"use server";

import { getAuthContext } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/types";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} from "./service";
import { revalidatePath } from "next/cache";

export async function getNotificationsAction(): Promise<
  ActionResult<{
    notifications: Awaited<ReturnType<typeof listNotifications>>;
    unreadCount: number;
  }>
> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "Sign in required" };

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(ctx.userId),
    getUnreadCount(ctx.userId),
  ]);

  return { ok: true, data: { notifications, unreadCount } };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "Sign in required" };

  await markAsRead(notificationId);
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "Sign in required" };

  await markAllRead(ctx.userId);
  revalidatePath("/", "layout");
  return { ok: true };
}
