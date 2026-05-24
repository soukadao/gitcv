# gitcv

> **試験的なリポジトリです。** 予告なく破壊的な変更が加わる可能性があります。

gitcv は Git リポジトリ上で動作するタスク管理ビューア / CLI です。

ユーザーはビューアでタスクの状態と履歴を確認し、AIエージェントはCLIでタスク一覧、詳細、親子関係を取得して作業対象を判断します。

## 設計方針

- 作業単位は `1タスク = 1ブランチ`
- ブランチ命名規則は組織ごとの規約に任せる
- タスクID、親子関係、関連ブランチ、アサイン、status は git notes のメタ情報に記録する
- タスク登録、status変更、アサイン変更、仕様、意思決定、レビューは empty commit + git notes で履歴として残す
- `done` は記録する status ではなく、関連ブランチのHEADが main または完了先ブランチに取り込まれているかで算出する

## 機能

- タスク一覧、検索、status / done / assignee フィルタ
- タスク詳細とイベントタイムライン表示
- git notes の Markdown（GFM）レンダリング
- アサイン済み / 未アサインタスクの抽出
- CLI の JSON 出力
- ライト / ダークモード切り替え

## 使い方

```sh
bun run build
gitcv serve
```

実行するディレクトリの Git リポジトリが対象になります。

## CLI

```sh
# タスクリストを表示
gitcv task list

# JSONで取得
gitcv task list --json

# 指定ユーザーにアサインされたタスクのみ取得
gitcv task list --assignee <user> --json

# 未アサインのタスクのみ取得
gitcv task list --unassigned --json

# タスク詳細を取得
gitcv task detail <task-id> --json

# タスクツリーを取得
gitcv task tree --json

```

## テスト

```sh
bun test
```

テストでは一時ディレクトリに実際のGitリポジトリを作成します。
その中でempty commit、git notes、ブランチ、マージを実行し、タスク抽出、アサイン絞り込み、未アサイン抽出、親子関係、`done`判定を確認します。

## タスクイベント

コミットの trailer に `Type` を設定します。

```text
Type: <type>
```

### タイプ一覧

| type | 用途 |
|---|---|
| `task` | タスク登録 |
| `status` | status変更 |
| `assign` | アサイン変更 |
| `spec` | 仕様、実装方針 |
| `decision` | 意思決定 |
| `review` | レビュー依頼、レビュー結果 |

## status

```yaml
open: 未着手
doing: 作業中
blocked: 外部要因などで停止中
review: レビュー待ち
ready: 完了先ブランチへマージ可能
closed: 対応しない、または中止
```

`done` は status として記録しません。

## 記録例

### タスク登録

```sh
git commit --allow-empty -m "認証フローを実装する" --trailer "Type: task"
git notes add -m "---
id: task-20260524-001
title: 認証フローを実装する
branch: feature/auth-flow
parent:
assignee: alice
status: open
---

## 概要

ログイン、ログアウト、セッション更新の基本フローを実装する。" HEAD
```

### status変更

```sh
git commit --allow-empty -m "認証フローの実装を開始" --trailer "Type: status"
git notes add -m "---
task: task-20260524-001
status: doing
---" HEAD
```

### アサイン変更

```sh
git commit --allow-empty -m "認証フローをAliceにアサイン" --trailer "Type: assign"
git notes add -m "---
task: task-20260524-001
assignee: alice
---" HEAD
```

### 仕様・意思決定・レビュー

```sh
git commit --allow-empty -m "認証フローの仕様を記録" --trailer "Type: spec"
git notes add -m "---
task: task-20260524-001
---

## 仕様

- ログイン成功時にセッションCookieを発行する
- セッション更新は期限の5分前から許可する" HEAD
```

## 共有

タスク共有のため、関連ブランチと git notes をリモートへ push します。

```sh
git push -u origin <branch>
git push origin refs/notes/*:refs/notes/*
```

他の環境で取得する場合:

```sh
git fetch origin refs/notes/*:refs/notes/*
```

## Claude Code スキル

gitcv を使った開発フローを Claude Code で効率化するスキルを提供しています。

### スキル一覧

| スキル | 説明 |
|---|---|
| `git-typed-commit` | タスクイベント用の empty commit と git notes 作成 |
| `git-branch-strategy` | 組織の命名規則に依存しないタスクブランチ管理 |

### ダウンロード

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh
```

インストール先を変更する場合は引数で指定できます。

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh -s -- /path/to/skills
```
