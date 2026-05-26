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

  test("groups branch work events and summarizes request loops", async () => {
    git("switch", "-c", "feature/profile");
    commitEvent("プロフィール改善を開始", "work", [
      "---",
      "branch: feature/profile",
      "parent_branch: main",
      "title: プロフィール改善",
      "status: doing",
      "---",
      "",
      "プロフィール表示の要件定義から実装までを扱う。",
    ].join("\n"));
    commitEvent("プロフィール仕様案を記録", "spec", [
      "---",
      "branch: feature/profile",
      "---",
      "",
      "肩書きと自己紹介を表示する。",
    ].join("\n"));
    commitEvent("プロフィール仕様の改善要求", "spec-comment", [
      "---",
      "branch: feature/profile",
      "id: req-001",
      "thread: profile-copy",
      "role: request",
      "---",
      "",
      "肩書きが長い場合の表示を決めてほしい。",
    ].join("\n"));
    commitEvent("プロフィール仕様を修正", "spec", [
      "---",
      "branch: feature/profile",
      "id: res-001",
      "thread: profile-copy",
      "role: response",
      "addresses: req-001",
      "resolution: fixed",
      "---",
      "",
      "肩書きは2行で省略する。",
    ].join("\n"));
    commitEvent("プロフィール仕様の追加改善要求", "spec-comment", [
      "---",
      "branch: feature/profile",
      "id: req-002",
      "thread: profile-copy",
      "role: request",
      "responds_to: res-001",
      "---",
      "",
      "2行省略時の全文確認手段も必要。",
    ].join("\n"));

    const tasks = await collectTasks(cwd);
    const work = tasks.find((task) => task.id === "branch:feature/profile");

    expect(work?.title).toBe("プロフィール改善");
    expect(work?.parentBranch).toBe("main");
    expect(work?.unresolvedRequestCount).toBe(1);
    expect(work?.requestThreads).toEqual([
      {
        thread: "profile-copy",
        latestRequestId: "req-002",
        status: "unresolved",
        requestEvent: expect.any(String),
        responseEvent: null,
        verdictEvent: null,
        resolution: null,
      },
    ]);
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
