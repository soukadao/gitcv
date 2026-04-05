import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "../shared/ui/layout";
import { Select } from "../shared/ui/select";
import { CommitPage } from "../pages/commit/commit";
import type { Commit } from "../pages/commit/commit-parse";
import { fetchBranches } from "../pages/commit/api/branches";
import { fetchCommits } from "../pages/commit/api/commits";
import "../shared/ui/global.css";
import "github-markdown-css/github-markdown-dark.css";

function App() {
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);

  useEffect(() => {
    fetchBranches()
      .then((list) => {
        setBranches(list);
        setBranch(list[0] ?? "");
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!branch) return;
    fetchCommits(branch).then(setCommits).catch(console.error);
  }, [branch]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-zinc-500">{commits.length} commits</p>
        <Select
          value={branch}
          onChange={setBranch}
          options={branches.map((b) => ({ value: b, label: b }))}
        />
      </div>
      <CommitPage commits={commits} />
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
