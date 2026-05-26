---
name: git-branch-strategy
description: >
  Use this skill when deciding how to create, associate, push, or merge branches for gitcv branch-based work records. The skill treats one branch as one work timeline and records parent relationships with parent_branch metadata.
---

# Git ブランチ作業戦略

gitcvでは、作業単位を`1ブランチ = 1つの仕事の流れ`として扱う。

要件定義、仕様、意思決定、実装、レビュー、修正対応は、同じ作業ブランチ上のtyped commit + git notesとして記録する。
親子関係は外部タスク管理ツールではなく、ブランチの派生と`parent_branch`メタ情報で表す。

## 原則

- ブランチは作業単位であり、開発記録のタイムライン。
- ブランチ作業は`Type: work`イベントで開始する。
- 表示上の親子関係は`parent_branch`に明示する。
- 要件、仕様、決定、実装、レビュー、修正対応は同じブランチに追加イベントとして積む。
- リクエストと対応は`thread`、`role`、`addresses`、`accepts`で結びつける。
- `done`は記録しない。関連ブランチのHEADがmainまたは完了先ブランチに取り込まれているかをgitcvが判定する。
- ブランチ作業共有のため、関連ブランチとgit notesをリモートへpushする。

## ブランチ命名

組織の規約に従う。

例:

```yaml
feature/auth-flow: 機能開発
bugfix/login-token: バグ修正
hotfix/payment-webhook-retry: 緊急修正
ticket/ABC-123: チケット番号ベース
release/0.0.2: リリース作業
```

gitcvはこれらの名前から作業種別を推定しない。
ただし、ブランチ名そのものは作業単位のidentityとして扱う。

## ブランチ作成

独立した作業は通常、mainまたは組織で定めたベースブランチから作成する。

```bash
git switch main
git pull --ff-only
git switch -c <branch>
```

親ブランチに強く依存する作業は、親ブランチから子ブランチを作成してよい。

```bash
git switch <parent-branch>
git switch -c <child-branch>
```

その場合も、表示上の親子関係は`parent_branch`に記録する。

```md
---
branch: <child-branch>
parent_branch: <parent-branch>
title: 子ブランチ作業
status: doing
---
```

## 作業開始イベント

ブランチを作成したら、同じブランチ上で`Type: work`イベントを作成する。

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

`parent_branch`と`assignee`は任意。

## リクエストループ

ユーザーが仕様や実装への改善要求を出す場合は、同じブランチにコメントイベントを追加する。

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

エージェントが対応した場合は、`addresses`で具体的なrequestを指す。

```bash
git commit --allow-empty -m "<対応内容>" --trailer "Type: fix"
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

同じ`thread`に新しい`role: request`が追加された場合、最新requestが未解決として扱われる。
対応イベントが追加されると`addressed`、`accepts`を持つ判定イベントが追加されると`accepted`として扱われる。

## 完了判定

手動で`status: done`は記録しない。

作業ブランチHEADがmainまたは完了先ブランチに到達可能な場合、gitcvが`done`として扱う。

概念的には以下の判定を行う。

```bash
git merge-base --is-ancestor <branch-head> main
```

まとめてリリースする運用では、releaseブランチなどの完了先ブランチに取り込まれているかを確認する。

## マージ

ブランチ作業が`ready`になったら、組織の運用に従ってmainまたはリリース用ブランチへマージする。

```bash
git switch main
git pull --ff-only
git merge --ff-only <branch>
```

squash mergeでは元ブランチHEADがmainに到達可能にならないため、gitcvの`done`判定ルールと合うか確認する。

## AIエージェントの作業開始

AIエージェントはCLIで作業対象を選ぶ。

```bash
gitcv task list --assignee <user> --json
gitcv task list --unassigned --json
gitcv task detail branch:<branch> --json
```

作業対象を決めたら、`branch`メタ情報のブランチへ移動する。

```bash
git switch <branch>
```
