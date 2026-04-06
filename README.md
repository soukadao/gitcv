# gitcv

> **試験的なリポジトリです。** 予告なく破壊的な変更が加わる可能性があります。

Git リポジトリのコミットメッセージおよび git notes をブラウザで閲覧するビューアです。

## 機能

- コミットのハッシュ・author・日時・メッセージを一覧表示
- git notes を Markdown（GFM）でレンダリング
- ブランチ切り替え
- ライト / ダークモード切り替え

## 使い方

```sh
bun run build
gitcv --url http://localhost:3000
```

実行するディレクトリの git リポジトリが対象になります。

## バッジ

コミットの trailer に以下のタイプを設定するとバッジが表示されます。

```
Type: <type>
```

### タイプ一覧

| タイプ | バッジ |
|---|---|
| `issue` | Issue |
| `spec` | Spec |
| `pr` | PR |
| `issue-comment` | Issue Comment |
| `spec-comment` | Spec Comment |
| `pr-comment` | PR Comment |
| `rd` | Requirements Definition |
| `rd-comment` | RD Comment |

### 設定例

## Claude Code スキル

gitcv を使った開発フローを Claude Code で効率化するスキルを提供しています。

### スキル一覧

| スキル | 説明 |
|---|---|
| `git-typed-commit` | タイプ付きコミットと git note の作成 |
| `git-branch-strategy` | トランクベース階層ブランチ管理 |

### ダウンロード

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh
```

インストール先を変更する場合は引数で指定できます。

```sh
curl -fsSL https://raw.githubusercontent.com/soukadao/gitcv/main/skills/install.sh | sh -s -- /path/to/skills
```

### 設定例

```
fix: バグを修正

Type: issue
```
