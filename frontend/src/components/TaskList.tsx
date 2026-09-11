import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Task, TaskStatus } from "../types";
import { useAuth } from "../context/AuthContext";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TaskList() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters live in the URL, not component state, so the filtered view is
  // shareable and survives a refresh, per spec.
  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const dueFrom = params.get("dueFrom") || "";
  const dueTo = params.get("dueTo") || "";

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function load() {
    setLoading(true);
    const res = await api.get("/tasks", { params: { status, priority, dueFrom, dueTo } });
    setTasks(res.data.tasks);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, dueFrom, dueTo]);

  async function moveStatus(taskId: string, newStatus: TaskStatus) {
    // Optimistic update, reconciled by the next activity event over the socket.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch {
      load(); // roll back by refetching on failure
    }
  }

  return (
    <div className="task-list">
      <div className="filters">
        <select value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => updateParam("priority", e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label>
          Due from
          <input type="date" value={dueFrom} onChange={(e) => updateParam("dueFrom", e.target.value)} />
        </label>
        <label>
          Due to
          <input type="date" value={dueTo} onChange={(e) => updateParam("dueTo", e.target.value)} />
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className={t.isOverdue ? "overdue-row" : ""}>
                <td>{t.title}</td>
                <td>{t.project?.name}</td>
                <td>{t.assignee?.name || "Unassigned"}</td>
                <td>{t.priority}</td>
                <td>
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                  {t.isOverdue && <span className="overdue-tag">Overdue</span>}
                </td>
                <td>
                  {/* Every role can hit this endpoint; the backend's
                      assertTaskAccess is what actually enforces who can move
                      which task, so a Developer only ever sees their own rows
                      to begin with. */}
                  <select value={t.status} onChange={(e) => moveStatus(t.id, e.target.value as TaskStatus)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
