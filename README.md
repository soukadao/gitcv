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

### 設定例

```
fix: バグを修正

Type: issue
```
