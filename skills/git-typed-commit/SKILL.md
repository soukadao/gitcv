---
name: git-typed-commit
description: "gitcv v0.0.2のタスク管理用に、typed empty commitとgit notesでタスク登録、status変更、アサイン変更、仕様、意思決定、レビューを記録するスキル。"
---

# Git タスクイベント

gitcv v0.0.2では、タスクの履歴をempty commit + git notesで記録する。

empty commitはイベント識別子として扱う。
git notesはユーザーとAIエージェントの双方が読む本文であり、先頭に機械可読なメタ情報を含める。

## 基本方針

- タスクは`Type: task`を持つempty commitで登録する。
- タスクID、親子関係、関連ブランチ、アサイン、statusはnotesのメタ情報に記録する。
- status変更、アサイン変更、仕様、意思決定、レビューは追加イベントとして記録する。
- 既存notesは上書きせず、履歴を追加する。
- `done`は記録しない。関連ブランチのHEADがmainまたは完了先ブランチに到達可能かどうかをgitcvが算出する。

## イベントタイプ

| type | 用途 |
|---|---|
| `task` | タスク登録 |
| `status` | status変更 |
| `assign` | アサイン変更 |
| `spec` | 仕様、実装方針 |
| `decision` | 意思決定 |
| `review` | レビュー依頼、レビュー結果 |

## status

記録できるstatusは以下のみ。

```yaml
open: 未着手
doing: 作業中
blocked: 外部要因などで停止中
review: レビュー待ち
ready: 完了先ブランチへマージ可能
closed: 対応しない、または中止
```

`done`はstatusとして記録しない。

## notesメタ情報

notesはfrontmatter風のメタ情報とMarkdown本文で構成する。

```md
---
id: task-20260524-001
title: 認証フローを実装する
branch: feature/auth-flow
parent:
assignee: alice
status: open
---

## 概要

ログイン、ログアウト、セッション更新の基本フローを実装する。
```

イベントが既存タスクに紐づく場合は`task`を指定する。

```md
---
task: task-20260524-001
status: doing
---

実装に着手する。
```

## コマンド

### タスク登録

```bash
git commit --allow-empty -m "<タスクタイトル>" --trailer "Type: task"
git notes add -m "---
id: <task-id>
title: <タスクタイトル>
branch: <branch>
parent: <parent-task-id>
assignee: <user>
status: open
---

## 概要

<本文>" HEAD
```

`parent`と`assignee`は任意。未アサインの場合は`assignee`を空にするか省略する。

### status変更

```bash
git commit --allow-empty -m "<status変更の要約>" --trailer "Type: status"
git notes add -m "---
task: <task-id>
status: <open|doing|blocked|review|ready|closed>
---

<必要なら理由>" HEAD
```

statusイベントでは本文を省略してもよい。
ビューアはstatusイベントを`open -> doing`のような遷移として表示する。

### アサイン変更

```bash
git commit --allow-empty -m "<アサイン変更の要約>" --trailer "Type: assign"
git notes add -m "---
task: <task-id>
assignee: <user>
---

<必要なら理由>" HEAD
```

未アサインに戻す場合は`assignee:`を空にする。

### 仕様、意思決定、レビュー

```bash
git commit --allow-empty -m "<イベント要約>" --trailer "Type: spec"
git notes add -m "---
task: <task-id>
---

## 仕様

<本文>" HEAD
```

`Type`は用途に応じて`spec`、`decision`、`review`を使う。

## 共有

タスク共有のため、関連ブランチとnotesはリモートへpushする。

```bash
git push -u origin <branch>
git push origin refs/notes/*:refs/notes/*
```

他の環境で取得する場合:

```bash
git fetch origin refs/notes/*:refs/notes/*
```

## 確認

AIエージェントはCLIでタスクを確認する。

```bash
gitcv task list --json
gitcv task list --assignee <user> --json
gitcv task list --unassigned --json
gitcv task detail <task-id> --json
gitcv task tree --json
```
