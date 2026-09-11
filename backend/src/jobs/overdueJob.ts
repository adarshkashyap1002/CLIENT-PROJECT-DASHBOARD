import cron from "node-cron";
import { prisma } from "../config/prisma";
import { getIO } from "../sockets";

// Runs every 5 minutes. node-cron over Bull here because this is a single
// stateless sweep with no per-item retry/backoff/priority needs — Bull earns
// its Redis dependency when you have queued work items with failure
// handling, not a periodic UPDATE ... WHERE query.
export function startOverdueJob() {
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const newlyOverdue = await prisma.task.findMany({
      where: { dueDate: { lt: now }, isOverdue: false, status: { not: "DONE" } },
      select: { id: true, projectId: true, title: true },
    });

    if (newlyOverdue.length === 0) return;

    await prisma.task.updateMany({
      where: { id: { in: newlyOverdue.map((t: { id: string }) => t.id) } },
      data: { isOverdue: true },
    });

    // Notify affected project rooms so dashboards update without a refresh.
    const io = getIO();
    for (const task of newlyOverdue) {
      io.to(`project:${task.projectId}`).emit("task:overdue", { taskId: task.id, title: task.title });
    }
    console.log(`[overdue-job] flagged ${newlyOverdue.length} task(s) as overdue`);
  });
}
