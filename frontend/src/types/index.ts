export type Role = "ADMIN" | "PM" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  projectId: string;
  assignee?: { id: string; name: string } | null;
  project?: { id: string; name: string };
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  actorName: string;
  taskId?: string | null;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  taskId?: string | null;
}
