import { Hono } from "hono";
import { join } from "path";
import { execute } from "../shared/executor";
import { parseCommits, COMMIT_LOG_ARGS } from "../pages/commit/commit-parse";
import type { BranchOrigin, CommitsResponse } from "../pages/commit/commit-parse";
import { parseGraphOutput } from "../pages/graph/graph-parse";
import { buildTaskTree, collectTasks } from "../pages/task/task-parse";

async function detectOrigin(
  cwd: string,
  branch: string,
  allBranches: string[]
): Promise<BranchOrigin | null> {
  const others = allBranches.filter((b) => b !== branch);
  if (others.length === 0) return null;

  const branchHead = (await execute(["rev-parse", branch], { cwd })).trim();

  let best: { date: string; hash: string; branch: string } | null = null;

  for (const other of others) {
    let hash: string;
    try {
      hash = (await execute(["merge-base", branch, other], { cwd })).trim();
    } catch {
      continue;
    }

    if (hash === branchHead) continue;

    const date = (await execute(["show", "-s", "--format=%aI", hash], { cwd })).trim();

    if (!best || date > best.date) {
      best = { date, hash, branch: other };
    }
  }

  return best ? { branch: best.branch, hash: best.hash } : null;
}

export function createApp(cwd: string, distDir: string) {
  const app = new Hono();

  app.get("/api/branches", async (c) => {
    const output = await execute(["branch", "--format=%(refname:short)"], { cwd });
    const branches = output.trim().split("\n").filter(Boolean);
    return c.json(branches);
  });

  app.get("/api/commits", async (c) => {
    const branch = c.req.query("branch") ?? "HEAD";

    const branchOutput = await execute(["branch", "--format=%(refname:short)"], { cwd });
    const allBranches = branchOutput.trim().split("\n").filter(Boolean);

    const origin = await detectOrigin(cwd, branch, allBranches);

    const range = origin ? `${origin.hash}..${branch}` : branch;
    const output = await execute([...COMMIT_LOG_ARGS, range], { cwd });

    return c.json({ commits: parseCommits(output), origin } satisfies CommitsResponse);
  });

  app.get("/api/graph", async (c) => {
    const sep = "\x1f";
    const output = await execute(
      ["log", "--graph", "--all", `--format=%H${sep}%P${sep}%an${sep}%aI${sep}%s${sep}%D`],
      { cwd }
    );
    return c.json(parseGraphOutput(output));
  });

  app.get("/api/tasks", async (c) => {
    const assignee = c.req.query("assignee") || undefined;
    const unassigned = c.req.query("unassigned") === "1";
    const tasks = await collectTasks(cwd, { assignee, unassigned });
    return c.json({ tasks });
  });

  app.get("/api/tasks/tree", async (c) => {
    const tasks = await collectTasks(cwd);
    return c.json({ tree: buildTaskTree(tasks) });
  });

  app.use("*", async (c) => {
    const pathname = new URL(c.req.url).pathname;
    const file = Bun.file(join(distDir, pathname));
    if (await file.exists()) {
      return new Response(file);
    }
    return new Response(Bun.file(join(distDir, "index.html")), {
      headers: { "Content-Type": "text/html" },
    });
  });

  return app;
}

export function startServer(url: string, cwd: string, distDir: string) {
  const parsed = new URL(url);
  const port = parsed.port ? parseInt(parsed.port) : parsed.protocol === "https:" ? 443 : 80;

  const app = createApp(cwd, distDir);

  Bun.serve({ hostname: parsed.hostname, port, fetch: app.fetch });

  console.log(`Listening on ${url}`);
}
