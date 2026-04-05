import { Hono } from "hono";
import { join } from "path";
import { execute } from "../shared/executor";
import { parseCommits, COMMIT_LOG_ARGS } from "../pages/commit/commit-parse";

export function createApp(cwd: string, distDir: string) {
  const app = new Hono();

  app.get("/api/branches", async (c) => {
    const output = await execute(["branch", "--format=%(refname:short)"], { cwd });
    const branches = output.trim().split("\n").filter(Boolean);
    return c.json(branches);
  });

  app.get("/api/commits", async (c) => {
    const branch = c.req.query("branch") ?? "HEAD";
    const output = await execute([...COMMIT_LOG_ARGS, branch], { cwd });
    return c.json(parseCommits(output));
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
