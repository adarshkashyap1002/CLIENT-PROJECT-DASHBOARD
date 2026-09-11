import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { getRecentActivityForProjects } from "../services/activity.service";
import { getOnlineUserCount } from "../sockets";

export async function getDashboard(req: AuthedRequest, res: Response) {
  const user = req.user!;

  if (user.role === "ADMIN") {
    const [totalProjects, tasksByStatus, overdueCount] = await Promise.all([
      prisma.project.count(),
      prisma.task.groupBy({ by: ["status"], _count: true }),
      prisma.task.count({ where: { isOverdue: true } }),
    ]);
    return res.json({
      totalProjects,
      tasksByStatus,
      overdueCount,
      onlineUsers: getOnlineUserCount(),
    });
  }

  if (user.role === "PM") {
    const projects = await prisma.project.findMany({ where: { createdById: user.userId } });
    const projectIds = projects.map((p: { id: string }) => p.id);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [tasksByPriority, upcoming] = await Promise.all([
      prisma.task.groupBy({ by: ["priority"], where: { projectId: { in: projectIds } }, _count: true }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, dueDate: { lte: weekFromNow, gte: new Date() } },
        orderBy: { dueDate: "asc" },
      }),
    ]);
    return res.json({ projectsCount: projects.length, tasksByPriority, upcomingDueThisWeek: upcoming });
  }

  // DEVELOPER
  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.userId },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  res.json({ tasks });
}

// GET /api/activity/catchup — reconnect catchup, scoped by role, read from DB.
export async function getActivityCatchup(req: AuthedRequest, res: Response) {
  const user = req.user!;
  let projectIds: string[];

  if (user.role === "ADMIN") {
    projectIds = (await prisma.project.findMany({ select: { id: true } })).map((p: { id: string }) => p.id);
  } else if (user.role === "PM") {
    projectIds = (
      await prisma.project.findMany({ where: { createdById: user.userId }, select: { id: true } })
    ).map((p: { id: string }) => p.id);
  } else {
    const tasks = await prisma.task.findMany({ where: { assigneeId: user.userId }, select: { projectId: true } });
    projectIds = Array.from(new Set<string>(tasks.map((t: { projectId: string }) => t.projectId)));
  }

  const events = await getRecentActivityForProjects(projectIds, 20);
  res.json({ events });
}
