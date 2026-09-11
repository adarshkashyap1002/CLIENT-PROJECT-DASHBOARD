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

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Every route above returns structured JSON errors on failure; this catches
  // anything that slips through (e.g. a thrown non-AppError) and still never
  // leaks a stack trace to the client.
  app.use(errorHandler);

  return app;
}
