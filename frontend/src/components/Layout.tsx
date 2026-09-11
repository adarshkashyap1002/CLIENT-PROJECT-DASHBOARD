import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLiveActivityContext } from "../context/LiveActivityContext";
import NotificationBell from "./NotificationBell";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, accessToken } = useAuth();
  const { notifications, unreadCount } = useLiveActivityContext();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Client Dashboard</h1>
        <div className="header-right">
          <span>{user?.name}</span>
          <span className="role-tag">{user?.role}</span>
          <NotificationBell liveNotifications={notifications} liveUnreadCount={unreadCount} />
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
