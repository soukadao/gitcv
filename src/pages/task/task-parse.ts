import { execute } from "../../shared/executor";

export type TaskStatus = "open" | "doing" | "blocked" | "review" | "ready" | "closed";

export type TaskEventType =
  | "task"
  | "status"
  | "assign"
  | "spec"
  | "review"
  | "decision"
  | "issue"
  | "issue-comment"
  | "spec-comment"
  | "pr"
  | "pr-comment"
  | "rd"
  | "rd-comment";

export interface TaskEvent {
  readonly type: TaskEventType;
  readonly hash: string;
  readonly author: string;
  readonly date: string;
  readonly message: string;
  readonly notes: string | null;
  readonly meta: Record<string, string>;
  readonly fromStatus?: TaskStatus;
  readonly toStatus?: TaskStatus;
}

export interface TaskSummary {
  readonly id: string;
  readonly title: string;
  readonly parent: string | null;
  readonly branch: string | null;
  readonly branchHead: string | null;
  readonly assignee: string | null;
  readonly status: TaskStatus;
  readonly done: boolean;
  readonly doneRefs: string[];
  readonly mergedToDoneRef: boolean;
  readonly sourceCommit: string;
  readonly latestEvent: string;
  readonly updatedAt: string;
  readonly events: TaskEvent[];
}

export interface TaskListResponse {
  readonly tasks: TaskSummary[];
}

export interface TaskTreeNode extends TaskSummary {
  readonly children: TaskTreeNode[];
}

export interface TaskTreeResponse {
  readonly tree: TaskTreeNode[];
}

interface RawEvent {
  readonly hash: string;
  readonly author: string;
  readonly date: string;
  readonly message: string;
  readonly trailers: Record<string, string>;
  readonly notes: string | null;
  readonly meta: Record<string, string>;
  readonly body: string | null;
}

interface CollectOptions {
  readonly assignee?: string;
  readonly unassigned?: boolean;
}

const TASK_LOG_ARGS = [
  "log",
  "--all",
  "--reverse",
  "--format=%H%n%an%n%aI%n%s%n%(trailers)%x01%N%x00",
];

const STATUSES = new Set<TaskStatus>(["open", "doing", "blocked", "review", "ready", "closed"]);
const TASK_EVENT_TYPES = new Set<TaskEventType>([
  "task",
  "status",
  "assign",
  "spec",
  "review",
  "decision",
  "issue",
  "issue-comment",
  "spec-comment",
  "pr",
  "pr-comment",
  "rd",
  "rd-comment",
]);

export async function collectTasks(cwd: string, options: CollectOptions = {}): Promise<TaskSummary[]> {
  const [logOutput, branches] = await Promise.all([
    execute(TASK_LOG_ARGS, { cwd }),
    listBranches(cwd),
  ]);

  const doneRefs = resolveDoneRefs(branches);
  const rawEvents = parseRawEvents(logOutput);
  const taskEvents = rawEvents.flatMap(toTaskEvent);
  const grouped = groupEvents(taskEvents);
  const tasks = await Promise.all(
    [...grouped.values()].map((events) => buildTaskSummary(cwd, events, doneRefs))
  );

  return filterTasks(tasks, options)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function filterTasks(tasks: TaskSummary[], options: CollectOptions): TaskSummary[] {
  return tasks
    .filter((task) => {
      if (options.unassigned && task.assignee) return false;
      if (options.assignee && task.assignee !== options.assignee) return false;
      return true;
    });
}

export function buildTaskTree(tasks: TaskSummary[]): TaskTreeNode[] {
  const nodes = new Map<string, TaskTreeNode>(
    tasks.map((task) => [task.id, { ...task, children: [] }])
  );
  const roots: TaskTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parent && nodes.has(node.parent)) {
      nodes.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: TaskTreeNode[]) => {
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const item of items) sortNodes(item.children);
  };
  sortNodes(roots);

  return roots;
}

function parseRawEvents(output: string): RawEvent[] {
  return output
    .split("\x00")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [mainPart, notesPart] = block.split("\x01");
      const lines = mainPart.split("\n");
      const [hash, author, date, message, ...trailerLines] = lines;
      const notes = notesPart?.trim() || null;
      const { meta, body } = parseNotes(notes);
      return {
        hash,
        author,
        date,
        message,
        trailers: parseTrailers(trailerLines),
        notes: body ?? notes,
        meta,
        body,
      };
    });
}

function parseTrailers(lines: string[]): Record<string, string> {
  const trailers: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    trailers[match[1].toLowerCase().trim()] = match[2].trim();
  }
  return trailers;
}

function parseNotes(notes: string | null): { meta: Record<string, string>; body: string | null } {
  if (!notes?.startsWith("---")) return { meta: {}, body: notes };

  const lines = notes.split("\n");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return { meta: {}, body: notes };

  const meta: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    meta[match[1].toLowerCase()] = match[2].trim();
  }

  const body = lines.slice(end + 1).join("\n").trim() || null;
  return { meta, body };
}

function toTaskEvent(event: RawEvent): TaskEvent[] {
  const type = event.trailers.type?.toLowerCase();
  if (!isTaskEventType(type)) return [];

  const taskId = taskIdForEvent(type, event);
  if (!taskId) return [];

  return [
    {
      type,
      hash: event.hash,
      author: event.author,
      date: event.date,
      message: event.message,
      notes: event.notes,
      meta: { ...event.meta, task: taskId },
    },
  ];
}

function taskIdForEvent(type: TaskEventType, event: RawEvent): string | null {
  if (type === "task") return event.meta.id || event.meta.task || event.hash.slice(0, 12);
  return event.meta.task || event.meta.id || null;
}

function isTaskEventType(value: string | undefined): value is TaskEventType {
  return !!value && TASK_EVENT_TYPES.has(value as TaskEventType);
}

function groupEvents(events: TaskEvent[]): Map<string, TaskEvent[]> {
  const grouped = new Map<string, TaskEvent[]>();
  for (const event of events) {
    const taskId = event.meta.task;
    const list = grouped.get(taskId) ?? [];
    list.push(event);
    grouped.set(taskId, list);
  }
  return grouped;
}

function withStatusTransitions(events: TaskEvent[]): TaskEvent[] {
  let current: TaskStatus = "open";
  return events.map((event) => {
    const next = isStatus(event.meta.status) ? event.meta.status : current;
    const enriched =
      event.type === "status" || (event.type === "task" && event.meta.status)
        ? { ...event, fromStatus: current, toStatus: next }
        : event;
    current = next;
    return enriched;
  });
}

async function buildTaskSummary(
  cwd: string,
  events: TaskEvent[],
  doneRefs: string[]
): Promise<TaskSummary> {
  const first = events[0];
  const latest = events[events.length - 1];
  const taskEvent = events.find((event) => event.type === "task") ?? first;
  const id = taskEvent.meta.id || taskEvent.meta.task;
  const title = latestValue(events, "title") || taskEvent.message;
  const parent = emptyToNull(latestValue(events, "parent"));
  const branch = emptyToNull(latestValue(events, "branch"));
  const assignee = emptyToNull(latestValue(events, "assignee") || latestValue(events, "assignees"));
  const status = latestStatus(events);
  const branchHead = branch ? await resolveRef(cwd, branch) : null;
  const mergedRefs = branchHead ? await refsContaining(cwd, branchHead, doneRefs) : [];
  const done = status !== "closed" && mergedRefs.length > 0;

  return {
    id,
    title,
    parent,
    branch,
    branchHead,
    assignee,
    status,
    done,
    doneRefs: mergedRefs,
    mergedToDoneRef: done,
    sourceCommit: taskEvent.hash,
    latestEvent: latest.hash,
    updatedAt: latest.date,
    events: withStatusTransitions(events),
  };
}

function latestValue(events: TaskEvent[], key: string): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const value = events[i].meta[key];
    if (value !== undefined) return value;
  }
  return null;
}

function latestStatus(events: TaskEvent[]): TaskStatus {
  const value = latestValue(events, "status");
  return isStatus(value) ? value : "open";
}

function isStatus(value: string | null): value is TaskStatus {
  return !!value && STATUSES.has(value as TaskStatus);
}

function emptyToNull(value: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function listBranches(cwd: string): Promise<string[]> {
  const output = await execute(["branch", "--all", "--format=%(refname:short)"], { cwd });
  return output
    .trim()
    .split("\n")
    .map((branch) => branch.trim())
    .filter(Boolean)
    .filter((branch) => !branch.endsWith("/HEAD"));
}

function resolveDoneRefs(branches: string[]): string[] {
  return branches.filter((branch) =>
    branch === "main" ||
    branch === "master" ||
    branch === "origin/main" ||
    branch === "origin/master" ||
    branch.startsWith("release/") ||
    branch.startsWith("origin/release/")
  );
}

async function resolveRef(cwd: string, ref: string): Promise<string | null> {
  try {
    return (await execute(["rev-parse", ref], { cwd })).trim();
  } catch {
    return null;
  }
}

async function refsContaining(cwd: string, hash: string, refs: string[]): Promise<string[]> {
  const contained: string[] = [];
  for (const ref of refs) {
    try {
      await execute(["merge-base", "--is-ancestor", hash, ref], { cwd });
      contained.push(ref);
    } catch {
      // The ref does not contain the task branch head.
    }
  }
  return contained;
}
