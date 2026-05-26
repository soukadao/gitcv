# gitcv

> **試験的なリポジトリです。** 予告なく破壊的な変更が加わる可能性があります。

gitcv は Git リポジトリ上で動作する、ブランチ単位の開発記録ビューア / CLI です。

1つの作業ブランチに、要件定義、仕様、意思決定、実装、レビュー、修正対応を typed commit + git notes として記録します。
ユーザーはビューアでブランチの流れを確認し、AIエージェントは CLI の JSON 出力から未解決リクエストや決定事項を読み取って次の作業を判断します。

## 設計方針

- 作業単位は `1ブランチ = 1つの仕事の流れ`
- タスク管理ツールの親子関係ではなく、ブランチと `parent_branch` で作業の親子関係を表す
- 要件、仕様、決定事項、実装、レビュー、修正対応は同じブランチのタイムラインに記録する
- empty commit はイベント識別子、git notes はユーザーとAIエージェントの双方が読む本文として扱う
- リクエストと対応は `thread`、`role`、`addresses`、`accepts` で結びつけ、未解決状態を算出する
- `done` は記録する status ではなく、関連ブランチの HEAD が main または完了先ブランチに取り込まれているかで算出する

## 機能

- ブランチ作業一覧、検索、status / done / assignee フィルタ
- ブランチ詳細とイベントタイムライン表示
- request / response / verdict によるリクエストスレッド表示
- git notes の Markdown（GFM）レンダリング
- アサイン済み / 未アサイン作業の抽出
- CLI の JSON 出力
- ライト / ダークモード切り替え

## 使い方

```sh
bun run build
gitcv serve
```

実行するディレクトリの Git リポジトリが対象になります。

## CLI

既存互換のため、コマンド名は `task` を維持しています。
出力対象には、従来のタスクイベントと新しいブランチ作業イベントの両方が含まれます。

```sh
# ブランチ作業リストを表示
gitcv task list

# JSONで取得
gitcv task list --json

# 指定ユーザーにアサインされた作業のみ取得
gitcv task list --assignee <user> --json

# 未アサインの作業のみ取得
gitcv task list --unassigned --json

# ブランチ作業詳細を取得
gitcv task detail branch:feature/profile --json

# ブランチ作業ツリーを取得
gitcv task tree --json
```

## イベント

コミットの trailer に `Type` を設定します。

```text
Type: <type>
```

### タイプ一覧

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
| `issue` / `issue-comment` | 問題報告と追記 |
| `pr` / `pr-comment` | PRに関する記録 |
| `rd` / `rd-comment` | 要件定義とそのコメント |

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

### ブランチ作業開始

```sh
git commit --allow-empty -m "プロフィール改善を開始" --trailer "Type: work"
git notes add -m "---
branch: feature/profile
parent_branch: main
title: プロフィール改善
assignee: alice
status: doing
---

## 概要

プロフィール表示の要件定義から実装までを扱う。" HEAD
```

### ユーザーの改善要求

```sh
git commit --allow-empty -m "プロフィール仕様の改善要求" --trailer "Type: spec-comment"
git notes add -m "---
branch: feature/profile
id: req-001
thread: profile-copy
role: request
---

## 改善してほしい点

肩書きが長い場合の表示を決めてほしい。" HEAD
```

### エージェントの対応

```sh
git commit --allow-empty -m "プロフィール仕様を修正" --trailer "Type: spec"
git notes add -m "---
branch: feature/profile
id: res-001
thread: profile-copy
role: response
addresses: req-001
resolution: fixed
---

## 仕様変更

肩書きは2行で省略し、全文は詳細表示で確認できる。" HEAD
```

同じ `thread` に新しい `role: request` が追加されると、その最新 request が未解決として扱われます。
対応イベントが追加されると `addressed`、ユーザーが `accepts` を持つ判定イベントを追加すると `accepted` になります。

## 共有

ブランチ作業共有のため、関連ブランチと git notes をリモートへ push します。

```sh
git push -u origin <branch>
git push origin refs/notes/*:refs/notes/*
```

他の環境で取得する場合:

```sh
git fetch origin refs/notes/*:refs/notes/*
```

## テスト

```sh
bun test
```

テストでは一時ディレクトリに実際の Git リポジトリを作成します。
その中で empty commit、git notes、ブランチ、マージを実行し、ブランチ作業抽出、リクエストスレッド、アサイン絞り込み、親子関係、`done` 判定を確認します。

## Claude Code スキル

gitcv を使った開発フローを Claude Code で効率化するスキルを提供しています。

### スキル一覧

| スキル | 説明 |
|---|---|
| `git-typed-commit` | ブランチ作業イベント用の empty commit と git notes 作成 |
| `git-branch-strategy` | ブランチ単位の作業管理と親子関係 |

### ダウンロード

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh
```

インストール先を変更する場合は引数で指定できます。

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh -s -- /path/to/skills
```
