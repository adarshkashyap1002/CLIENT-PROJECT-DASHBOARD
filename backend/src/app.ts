import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  if (origin === "http://localhost:5173") return true;
  const configured = env.clientOrigin?.trim();
  if (configured && origin === configured) return true;
  return false;
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(errorHandler);

  return app;
}
