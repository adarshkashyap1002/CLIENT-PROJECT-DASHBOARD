import { Router } from "express";
import { z } from "zod";
import { login, refresh, logout, me } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
