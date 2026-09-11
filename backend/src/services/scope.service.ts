import { AccessTokenPayload } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/errorHandler";

// Returns a Prisma `where` clause fragment for Project, scoped to what this
// user is allowed to see. Admin sees everything; PM sees only what they
// created; Developer has no direct project list (they see tasks only).
export function projectWhereForUser(user: AccessTokenPayload) {
  if (user.role === "ADMIN") return {};
  if (user.role === "PM") return { createdById: user.userId };
  throw new AppError(403, "FORBIDDEN", "Developers cannot list projects directly");
}

// Confirms a specific project is in-scope for this user, or throws 403/404.
// Used before any write to a project or its tasks.
export async function assertProjectAccess(user: AccessTokenPayload, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError(404, "NOT_FOUND", "Project not found");
  if (user.role === "ADMIN") return project;
  if (user.role === "PM" && project.createdById === user.userId) return project;
  throw new AppError(403, "FORBIDDEN", "You do not have access to this project");
}

// Returns a Prisma `where` clause fragment for Task, scoped by role. This is
// the query that stops a Developer from ever seeing another developer's
// tasks, even if they know the task ID and hit the endpoint directly.
export function taskWhereForUser(user: AccessTokenPayload) {
  if (user.role === "ADMIN") return {};
  if (user.role === "PM") return { project: { createdById: user.userId } };
  return { assigneeId: user.userId };
}

export async function assertTaskAccess(user: AccessTokenPayload, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");
  if (user.role === "ADMIN") return task;
  if (user.role === "PM" && task.project.createdById === user.userId) return task;
  if (user.role === "DEVELOPER" && task.assigneeId === user.userId) return task;
  throw new AppError(403, "FORBIDDEN", "You do not have access to this task");
}
