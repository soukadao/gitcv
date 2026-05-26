import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import type { TaskEvent, TaskStatus, TaskSummary } from "./task-parse";

interface Props {
  readonly tasks: TaskSummary[];
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  open: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-1 ring-zinc-500/20",
  doing: "bg-sky-500/10 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/20",
  blocked: "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/20",
  review: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20",
  closed: "bg-stone-500/10 text-stone-600 dark:text-stone-300 ring-1 ring-stone-500/20",
};

const EVENT_STYLE: Record<string, string> = {
  work: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  task: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  requirement: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
  status: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  assign: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
  spec: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  decision: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  implementation: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  fix: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

type DoneFilter = "all" | "done" | "not_done";
type StatusFilter = "all" | TaskStatus;
type AssigneeFilter = "all" | "unassigned" | string;

export function TaskPage({ tasks }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doneFilter, setDoneFilter] = useState<DoneFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");

  const assignees = useMemo(
    () => [...new Set(tasks.map((task) => task.assignee).filter((value): value is string => !!value))].sort(),
    [tasks]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      const text = `${task.title} ${task.id} ${task.branch ?? ""} ${task.assignee ?? ""} ${task.events.map((event) => event.notes ?? "").join(" ")}`.toLowerCase();
      const matchesQuery = query.trim() === "" || text.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesDone =
        doneFilter === "all" ||
        (doneFilter === "done" && task.done) ||
        (doneFilter === "not_done" && !task.done);
      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !task.assignee) ||
        task.assignee === assigneeFilter;
      return matchesQuery && matchesStatus && matchesDone && matchesAssignee;
    }),
    [assigneeFilter, doneFilter, query, statusFilter, tasks]
  );

  const selected = useMemo(
    () => filteredTasks.find((task) => task.id === selectedId) ?? filteredTasks[0] ?? null,
    [filteredTasks, selectedId]
  );

  const counts = useMemo(
    () => ({
      total: tasks.length,
      active: tasks.filter((task) => !task.done && task.status !== "closed").length,
      blocked: tasks.filter((task) => task.status === "blocked").length,
      ready: tasks.filter((task) => task.status === "ready" && !task.done).length,
      done: tasks.filter((task) => task.done).length,
      unassigned: tasks.filter((task) => !task.assignee).length,
      unresolved: tasks.reduce((count, task) => count + task.unresolvedRequestCount, 0),
    }),
    [tasks]
  );

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-600">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
        <p className="text-sm">No work branches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TaskToolbar
        counts={counts}
        shownCount={filteredTasks.length}
        query={query}
        statusFilter={statusFilter}
        doneFilter={doneFilter}
        assigneeFilter={assigneeFilter}
        assignees={assignees}
        onQueryChange={setQuery}
        onStatusChange={setStatusFilter}
        onDoneChange={setDoneFilter}
        onAssigneeChange={setAssigneeFilter}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr] min-h-[70vh]">
        <TaskList tasks={filteredTasks} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
        {selected ? <TaskDetail task={selected} /> : <NoFilteredTasks />}
      </div>
    </div>
  );
}

function TaskToolbar({
  counts,
  shownCount,
  query,
  statusFilter,
  doneFilter,
  assigneeFilter,
  assignees,
  onQueryChange,
  onStatusChange,
  onDoneChange,
  onAssigneeChange,
}: {
  readonly counts: {
    readonly total: number;
    readonly active: number;
    readonly blocked: number;
    readonly ready: number;
    readonly done: number;
    readonly unassigned: number;
    readonly unresolved: number;
  };
  readonly shownCount: number;
  readonly query: string;
  readonly statusFilter: StatusFilter;
  readonly doneFilter: DoneFilter;
  readonly assigneeFilter: AssigneeFilter;
  readonly assignees: string[];
  readonly onQueryChange: (value: string) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onDoneChange: (value: DoneFilter) => void;
  readonly onAssigneeChange: (value: AssigneeFilter) => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Work branches</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {shownCount} shown / {counts.total} total
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <SummaryPill label="active" value={counts.active} />
            <SummaryPill label="ready" value={counts.ready} />
            <SummaryPill label="blocked" value={counts.blocked} />
            <SummaryPill label="done" value={counts.done} />
            <SummaryPill label="unresolved" value={counts.unresolved} />
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-[1fr_160px_160px_180px]">
        <label className="relative">
          <span className="sr-only">Search work branches</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, branch, assignee, notes"
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-400"
          />
        </label>
        <FilterSelect
          value={statusFilter}
          onChange={(value) => onStatusChange(value as StatusFilter)}
          options={[
            ["all", "all status"],
            ["open", "open"],
            ["doing", "doing"],
            ["blocked", "blocked"],
            ["review", "review"],
            ["ready", "ready"],
            ["closed", "closed"],
          ]}
        />
        <FilterSelect
          value={doneFilter}
          onChange={(value) => onDoneChange(value as DoneFilter)}
          options={[
            ["all", "all done"],
            ["not_done", "not done"],
            ["done", "done"],
          ]}
        />
        <FilterSelect
          value={assigneeFilter}
          onChange={(value) => onAssigneeChange(value as AssigneeFilter)}
          options={[
            ["all", "all assignees"],
            ["unassigned", "unassigned"],
            ...assignees.map((assignee): [string, string] => [assignee, assignee]),
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly [string, string][];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Filter</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3 pr-9 text-sm text-zinc-800 dark:text-zinc-100 outline-none transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:focus:border-emerald-400"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.4}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}

function SummaryPill({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="h-14 w-full min-w-24 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2">
      <p className="text-[11px] uppercase text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function TaskList({
  tasks,
  selectedId,
  onSelect,
}: {
  readonly tasks: TaskSummary[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  return (
    <aside className="rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Branch list</p>
      </div>
      <ol className="max-h-[72vh] overflow-auto divide-y divide-zinc-200 dark:divide-zinc-800">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              onClick={() => onSelect(task.id)}
              className={`block h-24 w-full text-left px-3 py-2.5 transition-colors ${
                selectedId === task.id
                  ? "bg-emerald-50 dark:bg-emerald-950/30 shadow-[inset_3px_0_0_rgb(16_185_129)]"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{task.branch ?? "no branch"}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="truncate">{task.assignee ?? "unassigned"}</span>
                <span>·</span>
                <DoneBadge done={task.done} />
                {task.unresolvedRequestCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-300">{task.unresolvedRequestCount} unresolved</span>
                  </>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function NoFilteredTasks() {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">No work branches match the current filters</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Adjust search, status, done, or assignee.</p>
    </div>
  );
}

function TaskDetail({ task }: { readonly task: TaskSummary }) {
  return (
    <section className="min-w-0">
      <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{task.title}</h2>
              <p className="mt-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">{task.id}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={task.status} />
              <DoneBadge done={task.done} />
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-zinc-600 dark:text-zinc-300 sm:grid-cols-2 2xl:grid-cols-3">
            <MetaPill label="assignee" value={task.assignee ?? "unassigned"} />
            <MetaPill label="branch" value={task.branch ?? "none"} />
            {task.parent && <MetaPill label="parent" value={task.parent} />}
            {task.parentBranch && <MetaPill label="parent_branch" value={task.parentBranch} />}
            {task.unresolvedRequestCount > 0 && <MetaPill label="unresolved" value={String(task.unresolvedRequestCount)} />}
          </div>
        </div>
        {task.requestThreads.length > 0 && <RequestThreads task={task} />}
        <ol className="px-4 py-4 space-y-3">
          {task.events.map((event) => (
            <TimelineEvent key={event.hash} event={event} />
          ))}
        </ol>
        <GitDetails task={task} />
      </div>
    </section>
  );
}

function RequestThreads({ task }: { readonly task: TaskSummary }) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
      <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Request threads</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {task.requestThreads.map((thread) => (
          <div key={thread.thread} className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <code className="truncate font-mono text-zinc-600 dark:text-zinc-300">{thread.thread}</code>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 font-medium ${requestThreadStyle(thread.status)}`}>
                {thread.status}
              </span>
            </div>
            <p className="mt-1 truncate text-zinc-500 dark:text-zinc-400">
              latest {thread.latestRequestId}
              {thread.resolution ? ` · ${thread.resolution}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function requestThreadStyle(status: TaskSummary["requestThreads"][number]["status"]): string {
  if (status === "accepted") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "addressed") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function TimelineEvent({ event }: { readonly event: TaskEvent }) {
  const isStatusEvent = event.type === "status";
  const label =
    isStatusEvent && event.fromStatus && event.toStatus
      ? `${event.fromStatus} -> ${event.toStatus}`
      : event.type;
  const showNotes = !isStatusEvent && event.notes;

  return (
    <li className="relative pl-6">
      <span className="absolute left-0 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
      <span className="absolute left-[4px] top-6 bottom-[-14px] w-px bg-zinc-200 dark:bg-zinc-800" />
      <div className="rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${EVENT_STYLE[event.type] ?? EVENT_STYLE.task}`}>
            {label}
          </span>
          <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">{formatDate(event.date)}</span>
          <span className="hidden text-xs text-zinc-400 sm:inline">·</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{event.author}</span>
          <code className="ml-auto text-xs font-mono text-emerald-600 dark:text-emerald-400">{event.hash.slice(0, 7)}</code>
        </div>
        {showNotes && (
          <div className="px-3 py-2.5">
            <div className="markdown-body bg-transparent! text-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{event.notes}</Markdown>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function GitDetails({ task }: { readonly task: TaskSummary }) {
  return (
    <details className="border-t border-zinc-200 dark:border-zinc-700">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
        Git details
      </summary>
      <dl className="grid gap-3 px-4 pb-4 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <Fact label="work_id" value={task.id} />
        <Fact label="branch_head" value={task.branchHead?.slice(0, 12) ?? "unknown"} />
        <Fact label="source_commit" value={task.sourceCommit.slice(0, 12)} />
        <Fact label="latest_event" value={task.latestEvent.slice(0, 12)} />
        <Fact label="merged_to_done_ref" value={String(task.mergedToDoneRef)} />
        <div>
          <dt className="text-zinc-400 dark:text-zinc-500">done_refs</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {task.doneRefs.length > 0 ? task.doneRefs.map((ref) => (
              <code key={ref} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                {ref}
              </code>
            )) : <span className="text-zinc-500">none</span>}
          </dd>
        </div>
      </dl>
    </details>
  );
}

function StatusBadge({ status }: { readonly status: TaskStatus }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function DoneBadge({ done }: { readonly done: boolean }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
      done
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-1 ring-zinc-500/20"
    }`}>
      {done ? "done" : "not_done"}
    </span>
  );
}

function MetaPill({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 px-2 py-1">
      <span className="text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-zinc-400 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono text-zinc-700 dark:text-zinc-200 break-all">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
