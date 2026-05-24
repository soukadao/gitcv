#!/usr/bin/env bun
import { cli } from "gunshi";
import { join } from "path";
import { startServer } from "./server";
import pkg from "../../package.json" with { type: "json" };
import { buildTaskTree, collectTasks, type TaskSummary, type TaskTreeNode } from "../pages/task/task-parse";

const DEFAULT_URL = "http://localhost:5079";

const args = process.argv.slice(2);

if (args[0] === "task") {
  await runTaskCommand(args.slice(1));
} else {
  const serveArgs = args[0] === "serve" ? args.slice(1) : args;
  await cli(
    serveArgs,
    {
      name: "gitcv",
      description: "Git task viewer",
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
    { name: pkg.name, version: pkg.version, description: "Git task viewer" },
  );
}

async function runTaskCommand(args: string[]) {
  const command = args[0] ?? "list";
  const values = parseFlags(args.slice(1));
  const tasks = await collectTasks(process.cwd(), {
    assignee: values.assignee,
    unassigned: values.unassigned === "true",
  });

  if (command === "list") {
    if (values.json === "true") {
      console.log(JSON.stringify({ tasks }, null, 2));
      return;
    }
    printTaskList(tasks);
    return;
  }

  if (command === "tree") {
    const tree = buildTaskTree(tasks);
    if (values.json === "true") {
      console.log(JSON.stringify({ tree }, null, 2));
      return;
    }
    printTaskTree(tree);
    return;
  }

  if (command === "detail") {
    const id = values._[0];
    const task = tasks.find((item) => item.id === id);
    if (!id || !task) {
      console.error(id ? `Task not found: ${id}` : "Task id is required");
      process.exitCode = 1;
      return;
    }
    if (values.json === "true") {
      console.log(JSON.stringify({ task }, null, 2));
      return;
    }
    printTaskDetail(task);
    return;
  }

  console.error(`Unknown task command: ${command}`);
  process.exitCode = 1;
}

interface ParsedFlags {
  readonly _: string[];
  assignee?: string;
  json?: string;
  unassigned?: string;
}

function parseFlags(args: string[]): ParsedFlags {
  const values: ParsedFlags = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      values.json = "true";
    } else if (arg === "--unassigned") {
      values.unassigned = "true";
    } else if (arg === "--assignee") {
      values.assignee = args[++i] ?? "";
    } else if (arg.startsWith("--assignee=")) {
      values.assignee = arg.slice("--assignee=".length);
    } else {
      values._.push(arg);
    }
  }
  return values;
}

function printTaskList(tasks: TaskSummary[]) {
  for (const task of tasks) {
    const done = task.done ? "done" : "not_done";
    const assignee = task.assignee ?? "unassigned";
    const branch = task.branch ?? "no-branch";
    console.log(`${task.id}\t${task.status}\t${done}\t${assignee}\t${branch}\t${task.title}`);
  }
}

function printTaskTree(nodes: TaskTreeNode[], depth = 0) {
  for (const node of nodes) {
    const indent = "  ".repeat(depth);
    const done = node.done ? "done" : "not_done";
    console.log(`${indent}- ${node.id} [${node.status}/${done}] ${node.title}`);
    printTaskTree(node.children, depth + 1);
  }
}

function printTaskDetail(task: TaskSummary) {
  console.log(`${task.title}`);
  console.log(`id: ${task.id}`);
  console.log(`status: ${task.status}`);
  console.log(`done: ${task.done}`);
  console.log(`assignee: ${task.assignee ?? "unassigned"}`);
  console.log(`branch: ${task.branch ?? "none"}`);
  console.log(`parent: ${task.parent ?? "none"}`);
  console.log(`source_commit: ${task.sourceCommit}`);
  console.log(`latest_event: ${task.latestEvent}`);
  console.log("");
  for (const event of task.events) {
    console.log(`- ${event.type} ${event.hash.slice(0, 7)} ${event.date} ${event.message}`);
  }
}
