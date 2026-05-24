import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { buildTaskTree, collectTasks } from "./task-parse";

let cwd: string;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "gitcv-task-"));
  git("init", "-b", "main");
  git("config", "user.name", "Gitcv Test");
  git("config", "user.email", "gitcv@example.com");
  git("commit", "--allow-empty", "-m", "initial");
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

describe("collectTasks", () => {
  test("extracts task metadata, status transitions, assignee filters, tree, and derived done", async () => {
    git("switch", "-c", "feature/auth-flow");
    commitEvent("認証フローを実装する", "task", [
      "---",
      "id: task-auth",
      "title: 認証フローを実装する",
      "branch: feature/auth-flow",
      "assignee: alice",
      "status: open",
      "---",
      "",
      "## 概要",
      "",
      "ログイン、ログアウト、セッション更新を実装する。",
    ].join("\n"));
    commitEvent("認証フローをレビュー可能に変更", "status", [
      "---",
      "task: task-auth",
      "status: ready",
      "---",
    ].join("\n"));

    git("switch", "main");
    git("switch", "-c", "feature/profile-editor");
    commitEvent("プロフィール編集画面を追加する", "task", [
      "---",
      "id: task-profile",
      "title: プロフィール編集画面を追加する",
      "branch: feature/profile-editor",
      "parent: task-auth",
      "status: open",
      "---",
      "",
      "## 概要",
      "",
      "未アサインの子タスク。",
    ].join("\n"));

    let tasks = await collectTasks(cwd);
    expect(tasks).toHaveLength(2);

    const auth = tasks.find((task) => task.id === "task-auth");
    expect(auth?.title).toBe("認証フローを実装する");
    expect(auth?.assignee).toBe("alice");
    expect(auth?.status).toBe("ready");
    expect(auth?.done).toBe(false);
    expect(auth?.events.find((event) => event.type === "status")?.fromStatus).toBe("open");
    expect(auth?.events.find((event) => event.type === "status")?.toStatus).toBe("ready");

    const assigned = await collectTasks(cwd, { assignee: "alice" });
    expect(assigned.map((task) => task.id)).toEqual(["task-auth"]);

    const unassigned = await collectTasks(cwd, { unassigned: true });
    expect(unassigned.map((task) => task.id)).toEqual(["task-profile"]);

    const tree = buildTaskTree(tasks);
    const parent = tree.find((task) => task.id === "task-auth");
    expect(parent?.children.map((task) => task.id)).toEqual(["task-profile"]);

    git("switch", "main");
    git("merge", "--ff-only", "feature/auth-flow");

    tasks = await collectTasks(cwd);
    const mergedAuth = tasks.find((task) => task.id === "task-auth");
    expect(mergedAuth?.done).toBe(true);
    expect(mergedAuth?.doneRefs).toContain("main");
  });
});

function commitEvent(message: string, type: string, note: string) {
  git("commit", "--allow-empty", "-m", message, "--trailer", `Type: ${type}`);
  git("notes", "add", "-m", note, "HEAD");
}

function git(...args: string[]) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed\n${result.stderr}`);
  }

  return result.stdout;
}
