import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";

export async function listNotifications(req: AuthedRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n: { isRead: boolean }) => !n.isRead).length;
  res.json({ notifications, unreadCount });
}

export async function markRead(req: AuthedRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { isRead: true },
  });
  res.json({ success: true });
}

export async function markAllRead(req: AuthedRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
}
