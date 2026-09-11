import { ActivityEvent } from "../types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="empty-state">No activity yet.</p>;
  }
  return (
    <ul className="activity-feed">
      {events.map((e) => (
        <li key={e.id}>
          <span className="activity-message">{e.message}</span>
          <span className="activity-time">{timeAgo(e.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
