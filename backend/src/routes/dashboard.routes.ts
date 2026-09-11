import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboard, getActivityCatchup } from "../controllers/dashboard.controller";

const router = Router();
router.use(requireAuth);
router.get("/", getDashboard);
router.get("/activity/catchup", getActivityCatchup);

export default router;
