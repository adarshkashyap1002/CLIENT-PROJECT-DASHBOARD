import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { listTasks, createTask, updateTaskStatus } from "../controllers/task.controller";

const router = Router();

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

router.use(requireAuth);
router.get("/", listTasks);
router.post("/", requireRole("ADMIN", "PM"), validateBody(createTaskSchema), createTask);
// All three roles can hit this — assertTaskAccess inside the controller does
// the real scoping, so a developer can only ever move their own task.
router.patch("/:id/status", validateBody(updateStatusSchema), updateTaskStatus);

export default router;
