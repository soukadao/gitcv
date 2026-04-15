import { useEffect, useRef } from "react";
import type { GraphRow } from "./graph-parse";

const LANE_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function getLaneColor(index: number): string {
  return LANE_COLORS[Math.abs(index) % LANE_COLORS.length];
}

interface Props {
  rows: GraphRow[];
  selectedHash: string | null;
  onSelect: (hash: string) => void;
  scrollToHash: string | null;
}

export function GraphPage({ rows, selectedHash, onSelect, scrollToHash }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollToHash || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-hash="${scrollToHash}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollToHash]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-400 dark:text-zinc-600">
        <p className="text-sm">No commits found</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="font-mono text-xs">
      {rows.map((row, i) => (
        <GraphRowItem
          key={i}
          row={row}
          isSelected={row.type === "commit" && row.commit.hash === selectedHash}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function GraphRowItem({
  row,
  isSelected,
  onSelect,
}: {
  row: GraphRow;
  isSelected: boolean;
  onSelect: (hash: string) => void;
}) {
  if (row.type === "graph") {
    return (
      <div className="h-4 leading-4 whitespace-pre text-zinc-400 dark:text-zinc-600 select-none">
        {row.content}
      </div>
    );
  }

  const { graphPrefix, commit } = row;
  const starPos = graphPrefix.indexOf("*");
  const laneIndex = starPos >= 0 ? Math.floor(starPos / 2) : 0;
  const color = getLaneColor(laneIndex);
  const beforeStar = starPos >= 0 ? graphPrefix.slice(0, starPos) : graphPrefix;
  const afterStar = starPos >= 0 ? graphPrefix.slice(starPos + 1) : "";

  return (
    <div
      data-hash={commit.hash}
      onClick={() => onSelect(commit.hash)}
      className={`flex items-center h-8 cursor-pointer rounded px-0.5 transition-colors ${
        isSelected
          ? "bg-zinc-100 dark:bg-zinc-800 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
      }`}
    >
      {/* Graph prefix */}
      <span className="whitespace-pre text-zinc-400 dark:text-zinc-600 shrink-0 select-none">
        {beforeStar}
        <span style={{ color }}>●</span>
        {afterStar}
      </span>

      {/* Commit info */}
      <span className="flex items-center gap-1.5 min-w-0 ml-1 overflow-hidden">
        <code className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
          {commit.hash.slice(0, 7)}
        </code>
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
          {commit.message}
        </span>
        {commit.refs.length > 0 && (
          <span className="flex gap-0.5 shrink-0">
            {commit.refs.map((ref, i) => (
              <RefBadge key={i} refName={ref} />
            ))}
          </span>
        )}
      </span>
    </div>
  );
}

function RefBadge({ refName }: { refName: string }) {
  const isHeadBranch = refName.startsWith("HEAD -> ");
  const isHead = refName === "HEAD";
  const name = isHeadBranch ? refName.slice(8) : refName;
  const isRemote = !isHeadBranch && !isHead && (name.includes("/") || name.startsWith("origin"));

  return (
    <span
      className={`text-[9px] px-1.5 py-px rounded-full font-medium leading-none ${
        isHeadBranch
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
          : isHead
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20"
          : isRemote
          ? "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 ring-1 ring-zinc-500/20"
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20"
      }`}
    >
      {name}
    </span>
  );
}
