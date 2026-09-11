import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding...");
  const defaultPw = await hash("Password123!");

  const admin = await prisma.user.create({
    data: { name: "Aisha Rahman", email: "admin@agency.dev", passwordHash: defaultPw, role: Role.ADMIN },
  });

  const pm1 = await prisma.user.create({
    data: { name: "Rohan Mehta", email: "rohan.pm@agency.dev", passwordHash: defaultPw, role: Role.PM },
  });
  const pm2 = await prisma.user.create({
    data: { name: "Laura Kim", email: "laura.pm@agency.dev", passwordHash: defaultPw, role: Role.PM },
  });

  const devs = await Promise.all(
    ["Ravi Shah", "Meera Iyer", "Tom Baxter", "Yuki Tanaka"].map((name, i) =>
      prisma.user.create({
        data: { name, email: `dev${i + 1}@agency.dev`, passwordHash: defaultPw, role: Role.DEVELOPER },
      })
    )
  );

  const clientA = await prisma.client.create({ data: { name: "Northbridge Retail" } });
  const clientB = await prisma.client.create({ data: { name: "Orbital Fintech" } });
  const clientC = await prisma.client.create({ data: { name: "Verdant Foods" } });

  const projectA = await prisma.project.create({
    data: { name: "Storefront Revamp", clientId: clientA.id, createdById: pm1.id, description: "E-commerce rebuild" },
  });
  const projectB = await prisma.project.create({
    data: { name: "Payments Dashboard", clientId: clientB.id, createdById: pm1.id, description: "Internal fintech tooling" },
  });
  const projectC = await prisma.project.create({
    data: { name: "Supply Chain Portal", clientId: clientC.id, createdById: pm2.id, description: "Vendor tracking" },
  });

  const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE];
  const priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL];

  const projects = [projectA, projectA, projectB, projectB, projectC, projectC];
  const allTasks = [];

  let taskCounter = 0;
  for (const project of [projectA, projectB, projectC]) {
    for (let i = 0; i < 6; i++) {
      taskCounter++;
      const assignee = devs[taskCounter % devs.length];
      const status = statuses[taskCounter % statuses.length];
      const isPastDue = taskCounter % 5 === 0; // guarantees at least 2 overdue across 18 tasks
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (isPastDue ? -3 : 7));

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: `Task #${taskCounter}: ${["Build API", "Fix layout", "Write tests", "Design schema", "Review PR", "Deploy staging"][taskCounter % 6]}`,
          description: "Seed-generated task for demo purposes.",
          assigneeId: assignee.id,
          status,
          priority: priorities[taskCounter % priorities.length],
          dueDate,
          isOverdue: isPastDue && status !== TaskStatus.DONE,
        },
      });
      allTasks.push(task);

      await prisma.taskStatusLog.create({
        data: { taskId: task.id, toStatus: status, changedById: assignee.id },
      });

      await prisma.activityLog.create({
        data: {
          projectId: project.id,
          actorId: assignee.id,
          taskId: task.id,
          message: `${assignee.name} created task "${task.title}"`,
        },
      });
    }
  }

  await prisma.notification.create({
    data: { userId: devs[0].id, message: `You were assigned to "${allTasks[0].title}"`, taskId: allTasks[0].id },
  });
  await prisma.notification.create({
    data: { userId: pm1.id, message: `"${allTasks[2].title}" moved to In Review`, taskId: allTasks[2].id },
  });

  console.log("Seed complete.");
  console.log("Login with any seeded email + password: Password123!");
  console.log(`Admin: ${admin.email}`);
  console.log(`PMs: ${pm1.email}, ${pm2.email}`);
  console.log(`Devs: ${devs.map((d) => d.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
