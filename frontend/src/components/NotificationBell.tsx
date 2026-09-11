import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Notification } from "../types";

export default function NotificationBell({
  liveNotifications,
  liveUnreadCount,
}: {
  liveNotifications: Notification[];
  liveUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get("/notifications").then((res) => {
      setItems(res.data.notifications);
      setUnread(res.data.unreadCount);
    });
  }, []);

  // Merge in anything that arrived live since the initial fetch.
  useEffect(() => {
    if (liveNotifications.length === 0) return;
    setItems((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const fresh = liveNotifications.filter((n) => !ids.has(n.id));
      return [...fresh, ...prev];
    });
    setUnread(liveUnreadCount);
  }, [liveNotifications, liveUnreadCount]);

  async function markOne(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAll() {
    await api.patch("/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div className="notification-bell">
      <button onClick={() => setOpen((o) => !o)}>
        🔔 {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <strong>Notifications</strong>
            <button onClick={markAll}>Mark all read</button>
          </div>
          {items.length === 0 && <p className="empty-state">Nothing yet.</p>}
          <ul>
            {items.map((n) => (
              <li key={n.id} className={n.isRead ? "read" : "unread"} onClick={() => markOne(n.id)}>
                {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
