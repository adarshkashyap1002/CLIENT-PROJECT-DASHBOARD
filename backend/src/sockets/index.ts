import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { isAllowedOrigin } from "../app";

let io: Server;

// Tracks which socket IDs belong to which user, so the admin "online now"
// count reflects distinct users, not tabs, and so a user's personal
// notification room stays correct across multiple open tabs.
const onlineUsers = new Map<string, Set<string>>(); // userId -> set of socketIds

export function initSockets(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
  });

  // Every socket connection must present a valid access token, same as REST.
  // This is what prevents an unauthenticated or role-forged client from
  // joining a room it shouldn't be in.
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = (socket as any).user as { userId: string; role: string };

    // Personal room for this user's notifications.
    socket.join(`user:${user.userId}`);

    // Room assignment mirrors the exact same scoping used by the REST
    // endpoints (scope.service.ts) so a Developer's socket can never receive
    // a broadcast meant for a project they're not on.
    if (user.role === "ADMIN") {
      socket.join("global:admin");
    } else if (user.role === "PM") {
      const projects = await prisma.project.findMany({
        where: { createdById: user.userId },
        select: { id: true },
      });
      projects.forEach((p: { id: string }) => socket.join(`project:${p.id}`));
    } else {
      const tasks = await prisma.task.findMany({
        where: { assigneeId: user.userId },
        select: { projectId: true },
      });
      [...new Set(tasks.map((t: { projectId: string }) => t.projectId))].forEach((pid) =>
        socket.join(`project:${pid}`)
      );
    }

    if (!onlineUsers.has(user.userId)) onlineUsers.set(user.userId, new Set());
    onlineUsers.get(user.userId)!.add(socket.id);
    broadcastOnlineCount();

    socket.on("disconnect", () => {
      const set = onlineUsers.get(user.userId);
      set?.delete(socket.id);
      if (set && set.size === 0) onlineUsers.delete(user.userId);
      broadcastOnlineCount();
    });
  });
}

function broadcastOnlineCount() {
  io.to("global:admin").emit("presence:count", { count: onlineUsers.size });
}

export function getOnlineUserCount() {
  return onlineUsers.size;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

// Called when a task assignment changes which project a Developer (or a new
// PM project) should be receiving live events for. Rooms are assigned at
// connect time, so a mid-session assignment needs this to keep the socket's
// rooms in sync without forcing a reconnect. See README known limitations.
export function joinUserToProjectRoom(userId: string, projectId: string) {
  const socketIds = onlineUsers.get(userId);
  if (!socketIds) return;
  socketIds.forEach((id) => io.sockets.sockets.get(id)?.join(`project:${projectId}`));
}
