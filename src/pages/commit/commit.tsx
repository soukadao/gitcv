import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import type { Commit, CommitType, BranchOrigin } from "./commit-parse";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface Props {
  commits: Commit[];
  origin: BranchOrigin | null;
  onTreeClick: (hash: string) => void;
}

const TRAILER_STYLE: Record<CommitType, { label: string; className: string }> = {
  issue: { label: "Issue", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20" },
  spec: { label: "Spec", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20" },
  pr: { label: "PR", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20" },
  "issue-comment": { label: "Issue Comment", className: "bg-rose-500/10 text-rose-500 dark:text-rose-300 ring-1 ring-rose-500/20" },
  "spec-comment": { label: "Spec Comment", className: "bg-sky-500/10 text-sky-500 dark:text-sky-300 ring-1 ring-sky-500/20" },
  "pr-comment": { label: "PR Comment", className: "bg-violet-500/10 text-violet-500 dark:text-violet-300 ring-1 ring-violet-500/20" },
  rd: { label: "Requirements Definition", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20" },
  "rd-comment": { label: "RD Comment", className: "bg-orange-500/10 text-orange-500 dark:text-orange-300 ring-1 ring-orange-500/20" },
};

function BranchOriginBanner({ origin }: { origin: BranchOrigin }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md border border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-900/20">
      <svg className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10M8 7l-3 3m3-3l3 3M16 17V7m0 10l3-3m-3 3l-3-3" />
      </svg>
      <span className="text-xs text-violet-700 dark:text-violet-300">
        branched from{" "}
        <code className="font-mono font-semibold">{origin.branch}</code>
        <span className="ml-1 text-violet-400 dark:text-violet-500">({origin.hash.slice(0, 7)})</span>
      </span>
    </div>
  );
}

export function CommitPage({ commits, origin, onTreeClick }: Props) {
  if (commits.length === 0 && !origin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-600">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10M8 7l-3 3m3-3l3 3M16 17V7m0 10l3-3m-3 3l-3-3" />
        </svg>
        <p className="text-sm">No commits found</p>
      </div>
    );
  }

  return (
    <div>
      {origin && <BranchOriginBanner origin={origin} />}
      <ol className="space-y-3">
        {commits.map((commit) => (
          <CommitRow key={commit.hash} commit={commit} onTreeClick={onTreeClick} />
        ))}
      </ol>
    </div>
  );
}

function CopyButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`git show ${hash}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title={`git show ${hash}`}
      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-emerald-500">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>git show</span>
        </>
      )}
    </button>
  );
}

function TreeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="View in tree"
      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10M8 7l-3 3m3-3l3 3M16 17V7m0 10l3-3m-3 3l-3-3" />
      </svg>
      <span>Tree</span>
    </button>
  );
}

function CommitRow({ commit, onTreeClick }: { commit: Commit; onTreeClick: (hash: string) => void }) {
  const initial = commit.author.charAt(0).toUpperCase();

  return (
    <li>
      {/* Commit comment bubble */}
      <div className="rounded-md border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{initial}</span>
          </div>
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{commit.author}</span>
          <span className="text-xs text-zinc-400">·</span>
          <code className="text-xs font-mono text-emerald-600 dark:text-emerald-500/80">{commit.hash.slice(0, 7)}</code>
          <span className="text-xs text-zinc-400">·</span>
          <span className="text-xs text-zinc-400">{formatDate(commit.date)}</span>
          <div className="flex items-center gap-2 ml-auto">
            {commit.trailers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {commit.trailers.map((trailer, i) => {
                  const style = TRAILER_STYLE[trailer.type];
                  return (
                    <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.className}`}>
                      {style.label}
                    </span>
                  );
                })}
              </div>
            )}
            <TreeButton onClick={() => onTreeClick(commit.hash)} />
            <CopyButton hash={commit.hash} />
          </div>
        </div>
        {/* Body */}
        <div className="px-3 py-2.5 bg-white dark:bg-zinc-900">
          <p className="text-sm text-zinc-800 dark:text-zinc-100 leading-snug">{commit.message}</p>
        </div>
      </div>

      {/* Notes comment bubble */}
      {commit.notes && (
        <div className="ml-8 mt-2 rounded-md border border-amber-200 dark:border-amber-700/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700/50">
            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Notes</span>
          </div>
          {/* Body */}
          <div className="px-3 py-2.5 bg-white dark:bg-zinc-900">
            <div className="markdown-body bg-transparent! text-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{commit.notes}</Markdown>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
