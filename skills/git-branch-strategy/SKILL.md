---
name: git-branch-strategy
description: >
  Use this skill when the user asks about branch naming conventions, how to create or structure branches for a feature or subtask, or how to merge a develop branch into main — because this skill defines the trunk-based branching strategy (develop/<yyyymmdd>-<feature> hierarchy) and provides the decision rules and commands for branch creation, decomposition, and trunk integration. Use it whenever the user is deciding where to branch from, what to name a branch (including where the date prefix goes), or how to bring a develop branch back into main. Do not use for commit-level operations like cherry-pick or rebase that don't involve branch structure decisions.
---

# Git ブランチ戦略

## ブランチ構造

```
main                                        # トランク — 常にリリース可能
develop/<yyyymmdd>-<feature>               # 独立したトップレベルの機能
develop/<yyyymmdd>-<feature>/<subtask>     # 親featureから派生したサブタスク
release/<version>                           # mainから切るリリースブランチ（任意）
```

### 命名規則

- `<yyyymmdd>` はブランチ作成日（例: `20260406`）— 先頭に置くことで一意性を保証し、日付順にソートされる
- `<feature>` はケバブケース（例: `user-auth`, `payment`）
- サブタスクに日付は付けない（親ブランチの日付で識別できるため）

例: `develop/20260406-user-auth`, `develop/20260406-user-auth/login`

## どこからブランチを切るか？

```
新しい作業が発生
  └─ 既存ブランチと独立している？
       ├─ Yes → git switch -c develop/<yyyymmdd>-<feature> main
       └─ No  → 親ブランチが存在する？
                  ├─ Yes → git switch -c develop/<parent>/<subtask> develop/<parent>
                  └─ No  → develop/<parent> を先に作成してからブランチ
```

## ルール

- **`main`** はトランク。常にデプロイ可能。頻繁にマージする。
- **`develop/<yyyymmdd>-<feature>`** — 独立した要求ごとに1つ。`main` からブランチ。
- **`develop/<yyyymmdd>-<feature>/<subtask>`** — Claude Codeが要求を分解した場合。親の `develop/<yyyymmdd>-<feature>` からブランチ。
- **`release/<version>`** — `main` からのみ切る。`develop/` にはマージバックしない。
- **サブタスクブランチ (`develop/<yyyymmdd>-<feature>/<subtask>`)** — ローカルのみ。リモートにはpushしない。
- マージ後はブランチを削除する。

## ワークフロー

### 独立した新機能を開始

```bash
git switch -c develop/<yyyymmdd>-<feature> main
# 例: git switch -c develop/20260406-user-auth main
```

### 機能をサブタスクに分解

```bash
# develop/20260406-user-auth が存在する場合、login と token-refresh に分解
git switch -c develop/20260406-user-auth/login develop/20260406-user-auth
git switch -c develop/20260406-user-auth/token-refresh develop/20260406-user-auth
```

### 独立した並行タスクを追加

```bash
git switch -c develop/20260406-payment main
```

### トランクへのマージ

```bash
git switch main
git merge --ff-only develop/<yyyymmdd>-<feature>   # fast-forwardを優先
# またはスカッシュ: git merge --squash develop/<yyyymmdd>-<feature> && git commit
git branch -d develop/<yyyymmdd>-<feature>
```

### リリースブランチを切る

```bash
git switch -c release/1.0.0 main
```

## 例 — 全体的な分解

要求：「ユーザー管理機能」を 認証（→ ログイン、トークン更新）と独立したプロフィール機能に分解（2026/04/06）

```bash
git switch -c develop/20260406-user-management main
git switch -c develop/20260406-user-management/auth develop/20260406-user-management
git switch -c develop/20260406-user-management/auth/login develop/20260406-user-management/auth
git switch -c develop/20260406-user-management/auth/token-refresh develop/20260406-user-management/auth
git switch -c develop/20260406-user-profile main   # 独立
```

結果のツリー：

```
main
├── develop/20260406-user-management
│   └── develop/20260406-user-management/auth
│       ├── develop/20260406-user-management/auth/login
│       └── develop/20260406-user-management/auth/token-refresh
└── develop/20260406-user-profile
```
