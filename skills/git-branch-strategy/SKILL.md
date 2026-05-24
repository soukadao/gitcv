---
name: git-branch-strategy
description: >
  Use this skill when deciding how to create, associate, push, or merge branches for gitcv v0.0.2 tasks. The skill treats one task as one branch, but does not impose a branch naming convention; task identity, parent relation, assignee, and status are recorded in git notes metadata.
---

# Git タスクブランチ戦略

gitcv v0.0.2では、作業単位を`1タスク = 1ブランチ`として扱う。

ただし、ブランチ命名規則は組織ごとに異なるため、gitcvはブランチ名からタスクIDや親子関係を決定しない。
タスクID、親子関係、関連ブランチ、アサイン、statusはgit notesのメタ情報で明示する。

## 原則

- ブランチはタスクの作業場所。
- タスクIDはブランチ名ではなく、`Type: task`イベントのnotesメタ情報に記録する。
- 親子関係はブランチ名から推定せず、`parent`メタ情報で記録する。
- アサインは任意。未アサインのタスクも有効。
- `done`は記録しない。関連ブランチのHEADがmainまたは完了先ブランチに取り込まれているかをgitcvが判定する。
- タスク共有のため、関連ブランチとgit notesをリモートへpushする。

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

gitcvはこれらの名前からタスク種別や親子関係を推定しない。

## ブランチ作成

独立したタスクは通常、mainまたは組織で定めたベースブランチから作成する。

```bash
git switch main
git pull --ff-only
git switch -c <branch>
```

親タスクに強く依存する子タスクは、親タスクのブランチから作成してよい。

```bash
git switch <parent-branch>
git switch -c <child-branch>
```

ただし、親子関係は必ずタスクnotesの`parent`に記録する。

```md
---
id: task-child
title: 子タスク
branch: <child-branch>
parent: task-parent
status: open
---
```

## タスク登録との関係

ブランチを作成したら、同じブランチ上で`Type: task`イベントを作成する。

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

`branch`には実際の作業ブランチ名を記録する。
`parent`と`assignee`は任意。

## 共有

タスクはリモートリポジトリで共有される前提。
ブランチだけでなくnotesもpushする。

```bash
git push -u origin <branch>
git push origin refs/notes/*:refs/notes/*
```

他の環境ではnotesをfetchする。

```bash
git fetch origin refs/notes/*:refs/notes/*
```

## 完了判定

手動で`status: done`は記録しない。

タスクの関連ブランチHEADがmainまたは完了先ブランチに到達可能な場合、gitcvが`done`として扱う。

概念的には以下の判定を行う。

```bash
git merge-base --is-ancestor <task-branch-head> main
```

まとめてリリースする運用では、releaseブランチなどの完了先ブランチに取り込まれているかを確認する。

## マージ

タスクが`ready`になったら、組織の運用に従ってmainまたはリリース用ブランチへマージする。

```bash
git switch main
git pull --ff-only
git merge --ff-only <branch>
```

または、組織がsquash mergeを採用している場合はその運用に従う。
ただし、squash mergeでは元ブランチHEADがmainに到達可能にならないため、gitcvの`done`判定ルールと合うか確認する。

## AIエージェントの作業開始

AIエージェントはブランチ名ではなくCLIで作業対象を選ぶ。

```bash
gitcv task list --assignee <user> --json
gitcv task list --unassigned --json
gitcv task detail <task-id> --json
```

作業対象を決めたら、`branch`メタ情報のブランチへ移動する。

```bash
git switch <branch>
```
