import { prisma } from "../config/prisma";
import { getIO } from "../sockets";

export async function notifyUser(userId: string, message: string, taskId?: string) {
  const notification = await prisma.notification.create({
    data: { userId, message, taskId },
  });

  // Unread count is pushed over the user's personal socket room, not polled.
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
  getIO().to(`user:${userId}`).emit("notification:new", { notification, unreadCount });

  return notification;
}
