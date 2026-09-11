import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthedRequest } from "../middleware/auth";
import { projectWhereForUser, assertProjectAccess } from "../services/scope.service";

export async function listProjects(req: AuthedRequest, res: Response) {
  const where = projectWhereForUser(req.user!);
  const projects = await prisma.project.findMany({
    where,
    include: { client: true, _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ projects });
}

export async function createProject(req: AuthedRequest, res: Response) {
  const { name, description, clientId } = req.body;
  const project = await prisma.project.create({
    data: { name, description, clientId, createdById: req.user!.userId },
  });
  res.status(201).json({ project });
}

export async function getProject(req: AuthedRequest, res: Response) {
  const project = await assertProjectAccess(req.user!, req.params.id);
  const full = await prisma.project.findUnique({
    where: { id: project.id },
    include: { client: true, tasks: { include: { assignee: { select: { id: true, name: true } } } } },
  });
  res.json({ project: full });
}
