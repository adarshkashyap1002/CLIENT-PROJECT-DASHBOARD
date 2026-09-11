import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { listProjects, createProject, getProject } from "../controllers/project.controller";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().uuid(),
});

router.use(requireAuth);
router.get("/", listProjects);
router.get("/:id", getProject);
router.post("/", requireRole("ADMIN", "PM"), validateBody(createProjectSchema), createProject);

export default router;
