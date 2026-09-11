import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useLiveActivityContext } from "../context/LiveActivityContext";
import ActivityFeed from "../components/ActivityFeed";
import TaskList from "../components/TaskList";
import { Task } from "../types";

interface PMStats {
  projectsCount: number;
  tasksByPriority: { priority: string; _count: number }[];
  upcomingDueThisWeek: Task[];
}

export default function PMDashboard() {
  const { events } = useLiveActivityContext();
  const [stats, setStats] = useState<PMStats | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  return (
    <div className="dashboard-grid">
      <section className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats?.projectsCount ?? "—"}</div>
          <div className="stat-label">My Projects</div>
        </div>
        {stats?.tasksByPriority.map((p) => (
          <div className="stat-card" key={p.priority}>
            <div className="stat-value">{p._count}</div>
            <div className="stat-label">{p.priority}</div>
          </div>
        ))}
      </section>

      <section className="main-column">
        <h2>My Projects' Tasks</h2>
        <TaskList />

        <h3>Due This Week</h3>
        <ul className="upcoming-list">
          {stats?.upcomingDueThisWeek.map((t) => (
            <li key={t.id}>
              {t.title} — {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "no date"}
            </li>
          ))}
        </ul>
      </section>

      <aside className="side-column">
        <h2>My Projects' Activity</h2>
        <ActivityFeed events={events} />
      </aside>
    </div>
  );
}
