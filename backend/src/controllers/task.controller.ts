import { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { taskWhereForUser, assertProjectAccess, assertTaskAccess } from "../services/scope.service";
import { recordActivity } from "../services/activity.service";
import { notifyUser } from "../services/notification.service";
import { joinUserToProjectRoom } from "../sockets";
import { AppError } from "../middleware/errorHandler";

// Filters arrive as query params (?status=&priority=&dueFrom=&dueTo=) so the
// filtered view is a shareable URL, per spec, rather than client-side state.
export async function listTasks(req: AuthedRequest, res: Response) {
  const { status, priority, dueFrom, dueTo, projectId } = req.query as Record<string, string | undefined>;

  const where: any = { ...taskWhereForUser(req.user!) };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (projectId) where.projectId = projectId;
  if (dueFrom || dueTo) {
    where.dueDate = {};
    if (dueFrom) where.dueDate.gte = new Date(dueFrom);
    if (dueTo) where.dueDate.lte = new Date(dueTo);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  res.json({ tasks });
}

export async function createTask(req: AuthedRequest, res: Response) {
  const { projectId, title, description, assigneeId, priority, dueDate } = req.body;
  await assertProjectAccess(req.user!, projectId);

  const task = await prisma.task.create({
    data: { projectId, title, description, assigneeId, priority, dueDate: dueDate ? new Date(dueDate) : null },
  });

  if (assigneeId) {
    await notifyUser(assigneeId, `You were assigned to "${title}"`, task.id);
    joinUserToProjectRoom(assigneeId, projectId);
  }

  const actor = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  await recordActivity({
    projectId,
    actorId: req.user!.userId,
    actorName: actor!.name,
    taskId: task.id,
    message: `${actor!.name} created task "${title}"`,
  });

  res.status(201).json({ task });
}

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export async function updateTaskStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body;
  const task = await assertTaskAccess(req.user!, req.params.id);
  if (!Object.keys(STATUS_LABEL).includes(status)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid status value");
  }

  const previous = task.status;

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const t = await tx.task.update({ where: { id: task.id }, data: { status } });
    // Status history is a persisted row, never derived from the task's
    // current state, so a task's full history survives further edits.
    await tx.taskStatusLog.create({
      data: { taskId: task.id, fromStatus: previous, toStatus: status, changedById: req.user!.userId },
    });
    return t;
  });

  const actor = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  await recordActivity({
    projectId: task.projectId,
    actorId: req.user!.userId,
    actorName: actor!.name,
    taskId: task.id,
    message: `${actor!.name} moved "${task.title}" from ${STATUS_LABEL[previous]} → ${STATUS_LABEL[status]}`,
  });

  if (status === "IN_REVIEW") {
    const project = await prisma.project.findUnique({ where: { id: task.projectId } });
    if (project) {
      await notifyUser(project.createdById, `"${task.title}" moved to In Review`, task.id);
    }
  }

  res.json({ task: updated });
}
