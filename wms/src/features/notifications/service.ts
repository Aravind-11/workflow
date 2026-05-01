import { prisma } from "@/server/db/prisma";

export async function createNotification(input: {
  userId: string;
  warehouseId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({ data: input });
}

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function notifyRoles(
  warehouseId: string,
  roleNames: string[],
  notification: { type: string; title: string; body?: string; link?: string },
) {
  if (!roleNames.length) return;

  const userRoles = await prisma.userRole.findMany({
    where: {
      role: { name: { in: roleNames } },
      warehouseId,
    },
    select: { userId: true },
  });

  const uniqueUserIds = [...new Set(userRoles.map((ur) => ur.userId))];

  if (uniqueUserIds.length) {
    await prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        warehouseId,
        ...notification,
      })),
    });
  }
}
