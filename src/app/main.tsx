import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "../shared/ui/layout";
import { Select } from "../shared/ui/select";
import { CommitPage } from "../pages/commit/commit";
import { GraphPage } from "../pages/graph/graph";
import type { Commit, BranchOrigin } from "../pages/commit/commit-parse";
import type { GraphRow } from "../pages/graph/graph-parse";
import { fetchBranches } from "../pages/commit/api/branches";
import { fetchCommits } from "../pages/commit/api/commits";
import { fetchGraph } from "../pages/graph/api/graph";
import "../shared/ui/global.css";
import "github-markdown-css/github-markdown-dark.css";

type View = "list" | "tree";

function App() {
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [origin, setOrigin] = useState<BranchOrigin | null>(null);
  const [view, setView] = useState<View>("list");
  const [graphRows, setGraphRows] = useState<GraphRow[]>([]);
  const [treeSelectedHash, setTreeSelectedHash] = useState<string | null>(null);
  const [treeScrollHash, setTreeScrollHash] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches()
      .then((list) => {
        setBranches(list);
        setBranch(list[0] ?? "");
      })
      .catch(console.error);
    fetchGraph().then(setGraphRows).catch(console.error);
  }, []);

  useEffect(() => {
    if (!branch) return;
    fetchCommits(branch)
      .then(({ commits, origin }) => {
        setCommits(commits);
        setOrigin(origin);
      })
      .catch(console.error);
  }, [branch]);

  function handleTreeClick(hash: string) {
    setView("tree");
    setTreeSelectedHash(hash);
    setTreeScrollHash(hash);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {view === "list" && (
            <p className="text-xs text-zinc-500">{commits.length} commits</p>
          )}
          <ViewToggle view={view} onChange={setView} />
        </div>
        <Select
          value={branch}
          onChange={setBranch}
          options={branches.map((b) => ({ value: b, label: b }))}
        />
      </div>
      {view === "list" ? (
        <CommitPage commits={commits} origin={origin} onTreeClick={handleTreeClick} />
      ) : (
        <GraphPage
          rows={graphRows}
          selectedHash={treeSelectedHash}
          onSelect={setTreeSelectedHash}
          scrollToHash={treeScrollHash}
        />
      )}
    </Layout>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 text-xs">
      <button
        onClick={() => onChange("list")}
        className={`flex items-center gap-1 px-2 py-1 transition-colors ${
          view === "list"
            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        List
      </button>
      <button
        onClick={() => onChange("tree")}
        className={`flex items-center gap-1 px-2 py-1 border-l border-zinc-200 dark:border-zinc-700 transition-colors ${
          view === "tree"
            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10M8 7l-3 3m3-3l3 3M16 17V7m0 10l3-3m-3 3l-3-3" />
        </svg>
        Tree
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
