import { PrismaClient } from "@prisma/client";

// Single instance across the app, and reused across ts-node-dev hot reloads
// in dev so we don't exhaust Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient();
if (env_is_dev()) global.__prisma = prisma;

function env_is_dev() {
  return process.env.NODE_ENV !== "production";
}
