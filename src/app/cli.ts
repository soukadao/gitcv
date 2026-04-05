#!/usr/bin/env bun
import { cli } from "gunshi";
import { join } from "path";
import { startServer } from "./server";
import pkg from "../../package.json" with { type: "json" };

const DEFAULT_URL = "http://localhost:5079";

await cli(
  process.argv.slice(2),
  {
    name: "git-viewer",
    description: "Git commit viewer",
    args: {
      url: {
        type: "string",
        short: "u",
        default: DEFAULT_URL,
        description: `URL to serve on (default: "${DEFAULT_URL}")`,
      },
    },
    run(ctx) {
      const url = String(ctx.values.url ?? DEFAULT_URL);
      const distDir = join(import.meta.dirname, "..", "..", "dist");
      startServer(url, process.cwd(), distDir);
    },
  },
  { name: pkg.name, version: pkg.version, description: "Git commit viewer" },
);
