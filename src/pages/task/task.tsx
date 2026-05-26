import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { buildTaskTree, type TaskEvent, type TaskStatus, type TaskSummary, type TaskTreeNode } from "./task-parse";

interface Props {
  readonly tasks: TaskSummary[];
  readonly isRefreshing: boolean;
  readonly refreshError: string | null;
  readonly lastUpdatedAt: Date | null;
  readonly onRefresh: () => void;
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
type ActiveTab = "table" | "detail";

interface FlatTaskRow {
  readonly task: TaskTreeNode;
  readonly depth: number;
}

export function TaskPage({ tasks, isRefreshing, refreshError, lastUpdatedAt, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("table");
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

  const tableRows = useMemo(
    () => flattenTaskTree(buildTaskTree(filteredTasks)),
    [filteredTasks]
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
        <p className="text-sm">{isRefreshing ? "Loading work branches" : "No work branches found"}</p>
        {refreshError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{refreshError}</p>}
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
        isRefreshing={isRefreshing}
        refreshError={refreshError}
        lastUpdatedAt={lastUpdatedAt}
        onQueryChange={setQuery}
        onStatusChange={setStatusFilter}
        onDoneChange={setDoneFilter}
        onAssigneeChange={setAssigneeFilter}
        onRefresh={onRefresh}
      />
      <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        <TaskTabs activeTab={activeTab} onChange={setActiveTab} selected={selected} />
        <div className="min-h-[70vh]">
          {activeTab === "table" ? (
            <TaskManagementTable
              rows={tableRows}
              selectedId={selected?.id ?? null}
              onSelect={(id) => {
                setSelectedId(id);
              }}
              onOpenDetail={(id) => {
                setSelectedId(id);
                setActiveTab("detail");
              }}
            />
          ) : selected ? (
            <TaskDetail task={selected} />
          ) : (
            <NoFilteredTasks />
          )}
        </div>
      </div>
    </div>
  );
}

function flattenTaskTree(tree: TaskTreeNode[]): FlatTaskRow[] {
  const rows: FlatTaskRow[] = [];
  const walk = (items: TaskTreeNode[], depth: number) => {
    for (const task of items) {
      rows.push({ task, depth });
      walk(task.children, depth + 1);
    }
  };
  walk(tree, 0);
  return rows;
}

function TaskToolbar({
  counts,
  shownCount,
  query,
  statusFilter,
  doneFilter,
  assigneeFilter,
  assignees,
  isRefreshing,
  refreshError,
  lastUpdatedAt,
  onQueryChange,
  onStatusChange,
  onDoneChange,
  onAssigneeChange,
  onRefresh,
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
  readonly isRefreshing: boolean;
  readonly refreshError: string | null;
  readonly lastUpdatedAt: Date | null;
  readonly onQueryChange: (value: string) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onDoneChange: (value: DoneFilter) => void;
  readonly onAssigneeChange: (value: AssigneeFilter) => void;
  readonly onRefresh: () => void;
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
          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  refreshError
                    ? "bg-rose-500"
                    : isRefreshing
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                aria-hidden="true"
              />
              <span>{refreshError ? refreshError : isRefreshing ? "Refreshing" : "Auto-refresh on"}</span>
              {lastUpdatedAt && <span>Updated {lastUpdatedAt.toLocaleTimeString()}</span>}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5M19 5h-5M5 19h5" />
                </svg>
                Refresh
              </button>
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

function TaskTabs({
  activeTab,
  onChange,
  selected,
}: {
  readonly activeTab: ActiveTab;
  readonly onChange: (tab: ActiveTab) => void;
  readonly selected: TaskSummary | null;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-3 md:flex-row md:items-center md:justify-between">
      <div className="inline-flex w-fit rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1" role="tablist" aria-label="Task view">
        <TabButton active={activeTab === "table"} onClick={() => onChange("table")}>
          Task table
        </TabButton>
        <TabButton active={activeTab === "detail"} onClick={() => onChange("detail")}>
          Detail
        </TabButton>
      </div>
      <p className="min-w-0 truncate text-xs text-zinc-500 dark:text-zinc-400">
        Selected: <span className="font-mono text-zinc-700 dark:text-zinc-200">{selected?.branch ?? selected?.id ?? "none"}</span>
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function TaskManagementTable({
  rows,
  selectedId,
  onSelect,
  onOpenDetail,
}: {
  readonly rows: FlatTaskRow[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onOpenDetail: (id: string) => void;
}) {
  if (rows.length === 0) return <NoFilteredTasks />;

  return (
    <div className="overflow-auto max-h-[72vh] overscroll-contain">
      <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-xs">
        <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800 text-[11px] uppercase text-zinc-500 dark:text-zinc-400">
          <tr>
            <TableHead className="w-[34%]">Task / branch</TableHead>
            <TableHead className="w-[16%]">Parent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Done</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Requests</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ task, depth }) => (
            <TaskTableRow
              key={task.id}
              task={task}
              depth={depth}
              selected={selectedId === task.id}
              onSelect={onSelect}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children, className = "" }: { readonly children: string; readonly className?: string }) {
  return (
    <th className={`border-b border-zinc-200 dark:border-zinc-700 px-3 py-2 font-semibold ${className}`}>
      {children}
    </th>
  );
}

function TaskTableRow({
  task,
  depth,
  selected,
  onSelect,
  onOpenDetail,
}: {
  readonly task: TaskTreeNode;
  readonly depth: number;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
  readonly onOpenDetail: (id: string) => void;
}) {
  const parentLabel = task.parent ?? task.parentBranch ?? "root";

  return (
    <tr
      className={`group cursor-pointer border-b border-zinc-100 transition-colors dark:border-zinc-800 ${
        selected
          ? "bg-emerald-50/80 dark:bg-emerald-950/30"
          : "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/70"
      }`}
      onClick={() => onSelect(task.id)}
    >
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top">
        <div className="grid min-w-0 grid-cols-[auto_1fr] items-start gap-2" style={{ paddingInlineStart: `${depth * 1.25}rem` }}>
          <span className={`mt-1 h-2 w-2 rounded-full ${depth === 0 ? "bg-zinc-400" : "bg-emerald-500"}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{task.title}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{task.branch ?? task.id}</p>
          </div>
        </div>
      </td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top">
        <code className="block max-w-44 truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {parentLabel}
        </code>
      </td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top"><StatusBadge status={task.status} /></td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top"><DoneBadge done={task.done} /></td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top text-zinc-600 dark:text-zinc-300">{task.assignee ?? "unassigned"}</td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top">
        <span className={task.unresolvedRequestCount > 0 ? "font-medium text-amber-700 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}>
          {task.unresolvedRequestCount}
        </span>
      </td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 align-top text-zinc-500 dark:text-zinc-400">{formatDate(task.updatedAt)}</td>
      <td className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-2 align-top text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail(task.id);
          }}
          className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
        >
          Detail
        </button>
      </td>
    </tr>
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
      <div className="bg-white dark:bg-zinc-900 overflow-hidden">
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
