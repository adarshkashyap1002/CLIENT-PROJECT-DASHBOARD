import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "../api/client";
import { ActivityEvent, Notification } from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function useLiveActivity(accessToken: string | null) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL, { auth: { token: accessToken } });
    socketRef.current = socket;

    // On (re)connect, fetch the last 20 events from the DB so nothing is
    // missed while the socket was down, then merge (not replace) with
    // whatever arrived live in the meantime, de-duped by id.
    async function catchUp() {
      const res = await api.get("/dashboard/activity/catchup");
      const fetched: ActivityEvent[] = res.data.events.map((e: any) => ({
        id: e.id,
        projectId: e.projectId,
        actorName: e.actor.name,
        taskId: e.taskId,
        message: e.message,
        createdAt: e.createdAt,
      }));
      setEvents((prev) => {
        const merged = [...fetched, ...prev].filter((e) => {
          if (seenIds.current.has(e.id)) return false;
          seenIds.current.add(e.id);
          return true;
        });
        return merged.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 50);
      });
    }

    socket.on("connect", catchUp);

    socket.on("activity:new", (event: ActivityEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);
      setEvents((prev) => [event, ...prev].slice(0, 50));
    });

    socket.on("presence:count", ({ count }: { count: number }) => setOnlineCount(count));

    socket.on("notification:new", ({ notification, unreadCount }: { notification: Notification; unreadCount: number }) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount(unreadCount);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  return { events, onlineCount, notifications, unreadCount, setNotifications, setUnreadCount };
}
