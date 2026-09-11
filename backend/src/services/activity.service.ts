import { prisma } from "../config/prisma";
import { getIO } from "../sockets";

interface RecordActivityInput {
  projectId: string;
  actorId: string;
  actorName: string;
  taskId?: string;
  message: string;
}

// Every activity event is written to Postgres first, then broadcast. This
// ordering matters: if the emit fires before the write commits, a client
// reconnecting a moment later could fetch catchup data that doesn't yet
// include the event it already saw live, producing a duplicate.
export async function recordActivity(input: RecordActivityInput) {
  const entry = await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId,
      taskId: input.taskId,
      message: input.message,
    },
  });

  getIO().to(`project:${input.projectId}`).emit("activity:new", {
    id: entry.id,
    projectId: entry.projectId,
    actorName: input.actorName,
    taskId: entry.taskId,
    message: entry.message,
    createdAt: entry.createdAt,
  });

  // Admin's global feed is a separate room every activity event also lands in.
  getIO().to("global:admin").emit("activity:new", {
    id: entry.id,
    projectId: entry.projectId,
    actorName: input.actorName,
    taskId: entry.taskId,
    message: entry.message,
    createdAt: entry.createdAt,
  });

  return entry;
}

// Reconnect catchup: a plain indexed query against ActivityLog, never a
// replay of in-memory state, so it survives server restarts.
export async function getRecentActivityForProjects(projectIds: string[], limit = 20) {
  if (projectIds.length === 0) return [];
  return prisma.activityLog.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true } } },
  });
}
