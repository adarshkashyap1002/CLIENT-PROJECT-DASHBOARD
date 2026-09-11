import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useLiveActivityContext } from "../context/LiveActivityContext";
import ActivityFeed from "../components/ActivityFeed";
import TaskList from "../components/TaskList";

interface AdminStats {
  totalProjects: number;
  tasksByStatus: { status: string; _count: number }[];
  overdueCount: number;
  onlineUsers: number;
}

export default function AdminDashboard() {
  const { events, onlineCount } = useLiveActivityContext();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  return (
    <div className="dashboard-grid">
      <section className="stats-row">
        <StatCard label="Total Projects" value={stats?.totalProjects ?? "—"} />
        <StatCard label="Overdue Tasks" value={stats?.overdueCount ?? "—"} />
        <StatCard label="Online Now" value={onlineCount ?? stats?.onlineUsers ?? "—"} />
        {stats?.tasksByStatus.map((s) => (
          <StatCard key={s.status} label={s.status.replace("_", " ")} value={s._count} />
        ))}
      </section>

      <section className="main-column">
        <h2>All Tasks</h2>
        <TaskList />
      </section>

      <aside className="side-column">
        <h2>Global Activity</h2>
        <ActivityFeed events={events} />
      </aside>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
