import { useLiveActivityContext } from "../context/LiveActivityContext";
import ActivityFeed from "../components/ActivityFeed";
import TaskList from "../components/TaskList";

export default function DeveloperDashboard() {
  const { events } = useLiveActivityContext();

  return (
    <div className="dashboard-grid">
      <section className="main-column">
        <h2>My Tasks</h2>
        {/* TaskList's GET /tasks is scoped server-side to assigneeId = me,
            so this table can never render another developer's tasks even
            though it's the same component every role uses. */}
        <TaskList />
      </section>

      <aside className="side-column">
        <h2>Activity on My Tasks</h2>
        <ActivityFeed events={events} />
      </aside>
    </div>
  );
}
