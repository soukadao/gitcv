---
name: git-typed-commit
description: "gitcvのブランチ単位開発記録用に、typed empty commitとgit notesで作業開始、要件、仕様、意思決定、実装、レビュー、修正対応を記録するスキル。"
---

# Git ブランチ作業イベント

gitcvでは、1つの作業ブランチに要件定義から開発までの履歴をempty commit + git notesで記録する。

empty commitはイベント識別子として扱う。
git notesはユーザーとAIエージェントの双方が読む本文であり、先頭に機械可読なメタ情報を含める。

## 基本方針

- 作業ブランチは`Type: work`を持つempty commitで開始する。
- 親子関係は`parent_branch`、作業場所は`branch`に記録する。
- 要件、仕様、意思決定、実装、レビュー、修正対応、status変更は追加イベントとして記録する。
- リクエストと対応は`thread`、`role`、`addresses`、`accepts`で結びつける。
- 既存notesは上書きせず、履歴を追加する。
- `done`は記録しない。関連ブランチのHEADがmainまたは完了先ブランチに到達可能かどうかをgitcvが算出する。

## イベントタイプ

| type | 用途 |
|---|---|
| `work` | ブランチ作業の開始 |
| `requirement` | 要件定義 |
| `spec` | 仕様、実装方針 |
| `spec-comment` | 仕様への改善要求、質問、指摘 |
| `decision` | 意思決定 |
| `implementation` | 実装内容の記録 |
| `review` | レビュー依頼、レビュー結果、対応判定 |
| `fix` | レビューや要求への対応 |
| `status` | status変更 |
| `assign` | アサイン変更 |

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
branch: feature/auth-flow
parent_branch: main
title: 認証フロー
assignee: alice
status: doing
---

## 概要

ログイン、ログアウト、セッション更新の基本フローを実装する。
```

イベントが既存ブランチ作業に紐づく場合は`branch`を指定する。

```md
---
branch: feature/auth-flow
status: doing
---

実装に着手する。
```

## コマンド

### ブランチ作業開始

```bash
git commit --allow-empty -m "<作業タイトル>" --trailer "Type: work"
git notes add -m "---
branch: <branch>
parent_branch: <parent-branch>
title: <作業タイトル>
assignee: <user>
status: doing
---

## 概要

<本文>" HEAD
```

`parent_branch`と`assignee`は任意。未アサインの場合は`assignee`を空にするか省略する。

### status変更

```bash
git commit --allow-empty -m "<status変更の要約>" --trailer "Type: status"
git notes add -m "---
branch: <branch>
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
branch: <branch>
assignee: <user>
---

<必要なら理由>" HEAD
```

未アサインに戻す場合は`assignee:`を空にする。

### 仕様、意思決定、レビュー、修正対応

```bash
git commit --allow-empty -m "<イベント要約>" --trailer "Type: spec"
git notes add -m "---
branch: <branch>
---

## 仕様

<本文>" HEAD
```

`Type`は用途に応じて`requirement`、`spec`、`decision`、`implementation`、`review`、`fix`を使う。

### リクエストと対応

ユーザーの改善要求:

```bash
git commit --allow-empty -m "<改善要求>" --trailer "Type: spec-comment"
git notes add -m "---
branch: <branch>
id: req-001
thread: <topic>
role: request
---

<本文>" HEAD
```

エージェントの対応:

```bash
git commit --allow-empty -m "<対応内容>" --trailer "Type: spec"
git notes add -m "---
branch: <branch>
id: res-001
thread: <topic>
role: response
addresses: req-001
resolution: fixed
---

<本文>" HEAD
```

対応イベントが追加されるとgitcvはそのthreadを`addressed`として扱う。
ユーザーが明示的に承認する場合は、`role: verdict`、`accepts: <response-id>`、`resolution: accepted`を記録する。

## 共有

ブランチ作業共有のため、関連ブランチとnotesはリモートへpushする。

```bash
git push -u origin <branch>
git push origin refs/notes/*:refs/notes/*
```

他の環境で取得する場合:

```bash
git fetch origin refs/notes/*:refs/notes/*
```

## 確認

AIエージェントはCLIでブランチ作業を確認する。

```bash
gitcv task list --json
gitcv task list --assignee <user> --json
gitcv task list --unassigned --json
gitcv task detail branch:<branch> --json
gitcv task tree --json
```
