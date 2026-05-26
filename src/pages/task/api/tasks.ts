import type { TaskListResponse, TaskTreeResponse, TaskSummary } from "../task-parse";

export interface FetchTasksOptions {
  readonly assignee?: string;
  readonly unassigned?: boolean;
  readonly signal?: AbortSignal;
}

export async function fetchTasks(options: FetchTasksOptions = {}): Promise<TaskSummary[]> {
  const params = new URLSearchParams();
  if (options.assignee) params.set("assignee", options.assignee);
  if (options.unassigned) params.set("unassigned", "1");

  const query = params.toString();
  const res = await fetch(`/api/tasks${query ? `?${query}` : ""}`, { signal: options.signal });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return ((await res.json()) as TaskListResponse).tasks;
}

export async function fetchTaskTree(): Promise<TaskTreeResponse> {
  const res = await fetch("/api/tasks/tree");
  if (!res.ok) throw new Error("Failed to fetch task tree");
  return (await res.json()) as TaskTreeResponse;
}
