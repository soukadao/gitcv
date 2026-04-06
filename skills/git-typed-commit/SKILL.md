---
name: git-typed-commit
description: "開発フロー上の各フェーズ（rd/issue → spec → pr → pr-comment）に対応したタイプ付きgitコミットと、git noteを作成するスキル。"
---

# Git タイプ付きコミット

## 開発フロー

タイプはフェーズごとに使い分ける。機能開発とバグ修正でフローの起点が異なる。

### 機能開発

```
rd → rd-comment
 ↓
spec → spec-comment
 ↓
coding（タイプなし通常コミット）
 ↓
testing（タイプなし通常コミット）
 ↓
pr（ブランチをリモートにpush）
 ↓
pr-comment（レビュー）
```

### バグ修正

```
issue → issue-comment
 ↓
spec → spec-comment
 ↓
coding（タイプなし通常コミット）
 ↓
testing（タイプなし通常コミット）
 ↓
pr（ブランチをリモートにpush）
 ↓
pr-comment（レビュー）
```

## タイプ一覧

| type | フェーズ | 意味 |
|------|---------|------|
| `rd` | 要求定義 | 機能開発の起点。要求・背景を記録 |
| `rd-comment` | 要求定義 | rdへの追記・議論 |
| `issue` | 課題定義 | バグ修正の起点。問題・再現手順を記録 |
| `issue-comment` | 課題定義 | issueへの追記・議論 |
| `spec` | 仕様定義 | 実装方針・仕様を記録 |
| `spec-comment` | 仕様定義 | specへの追記・議論 |
| `pr` | レビュー依頼 | ブランチをリモートにpushしてPRを記録 |
| `pr-comment` | レビュー | レビューコメント・指摘を記録 |

## コマンド

### コミットを作成

```bash
git commit --allow-empty -m "<メッセージ>" --trailer "Type: <type>"
```

### git noteを追加

```bash
git notes add -m "<ノートメッセージ>" HEAD
```

### prフェーズ（ブランチpush込み）

```bash
git push -u origin <branch>
git commit --allow-empty -m "<PRの概要>" --trailer "Type: pr"
```

## 使用例

**機能開発の起点：**

```bash
git commit --allow-empty -m "ユーザー認証フローを定義" --trailer "Type: rd"
git notes add -m "## 背景\nログイン機能が未実装" HEAD
```

**仕様定義：**

```bash
git commit --allow-empty -m "認証APIの仕様" --trailer "Type: spec"
git notes add -m "## エンドポイント\nPOST /auth/login" HEAD
```

**バグ修正の起点：**

```bash
git commit --allow-empty -m "ログイン時にトークンが二重発行される" --trailer "Type: issue"
```

**PRの作成：**

```bash
git push -u origin develop/20260406-user-auth
git commit --allow-empty -m "ユーザー認証機能のPR" --trailer "Type: pr"
```
