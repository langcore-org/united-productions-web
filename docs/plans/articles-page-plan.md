# 記事ページ実装プラン（/articles）

作成日: 2026-03-26

## 概要

ログイン不要で閲覧できるリリース・ガイド記事セクションを `/articles` に追加する。
`docs/guides/user-docs/getting-started.md` のようなドキュメントをそのまま記事として公開し、
今後もリリースノートや機能ガイドを追加していく基盤を作る。

---

## 認証方針

**ログイン不要（public）とする。**

理由：
- アカウント未作成の社員に対してもURLを共有できる
- リリース記事・使い方ガイドは機密情報を含まない
- 「記事を読んでからログインする」という自然な導線を作れる
- 社外から直接アクセスはできるが、URLが外部に広まるリスクは低く、内容も問題ない

実装上は既存の `app/(public)/` ルートグループに配置する。認証チェックは行わない。

---

## URL構成

```
/articles              記事一覧ページ
/articles/[slug]       記事詳細ページ
```

例：
- `/articles` — 全記事一覧、タイプ別フィルター
- `/articles/getting-started` — 利用開始ガイド
- `/articles/release-2026-03-26` — リリースノート

---

## コンテンツ管理方針

### ファイル配置

```
content/
  articles/
    getting-started.md
    release-2026-03-26.md
```

### frontmatter（各記事ファイルの先頭）

各Markdownファイルに以下のメタデータを付与する：

| フィールド    | 型       | 説明                                 |
|-------------|---------|--------------------------------------|
| `title`     | string  | 記事タイトル                          |
| `slug`      | string  | URL用識別子（ファイル名と一致させる）   |
| `date`      | string  | 公開日（YYYY-MM-DD）                  |
| `type`      | string  | `release` / `guide` / `update`       |
| `description` | string | 一覧ページに表示する概要文            |
| `published` | boolean | `false` で下書き扱い（一覧に表示しない）|

### ライブラリ

`gray-matter` を追加インストール。frontmatter のパースに使用。
Markdownのレンダリングは既存の `react-markdown` + `remark-gfm` を流用。

---

## ファイル構成

```
app/
  (public)/
    articles/
      page.tsx               記事一覧ページ
      [slug]/
        page.tsx             記事詳細ページ

content/
  articles/
    getting-started.md       既存ドキュメントを移植
    release-2026-03-26.md    初回リリースノート

lib/
  articles/
    index.ts                 getAllArticles() / getArticleBySlug() ユーティリティ
```

---

## 各ページの仕様

### 記事一覧ページ（`/articles`）

- 全公開記事を新しい順に表示
- タイプ別フィルタータブ（全て / リリース / ガイド / アップデート）
- 各記事カードに表示する情報：タイトル、日付、タイプバッジ、概要文
- ヘッダー：サービス名・説明文
- ログインしていない場合も閲覧可能

### 記事詳細ページ（`/articles/[slug]`）

- Markdownをそのままレンダリング（テーブル・コードブロック対応）
- パンくずリスト（記事一覧 > タイトル）
- 記事下部に「アプリを使ってみる」CTAボタン（`/auth/signin` へのリンク）
- `published: false` の記事は404を返す
- SSG（静的生成）で実装し、パフォーマンスを確保

---

## ユーティリティ仕様（lib/articles/index.ts）

| 関数 | 返す値 | 用途 |
|------|------|------|
| `getAllArticles()` | 全公開記事のメタデータ配列（本文なし） | 一覧ページ |
| `getArticleBySlug(slug)` | 記事メタデータ + Markdownコンテンツ | 詳細ページ |
| `getAllSlugs()` | slug文字列の配列 | SSGのgenerateStaticParams用 |

---

## 実装ステップ

1. `gray-matter` をインストール
2. `content/articles/` ディレクトリを作成し、最初の記事ファイルを配置
   - `getting-started.md`（`docs/guides/user-docs/getting-started.md` を移植・frontmatter付与）
   - `release-2026-03-26.md`（リリースノート）
3. `lib/articles/index.ts` を作成（記事読み込みユーティリティ）
4. `app/(public)/articles/page.tsx` を作成（一覧ページ）
5. `app/(public)/articles/[slug]/page.tsx` を作成（詳細ページ）

---

## 将来の拡張

- 記事を追加するときは `content/articles/` に `.md` ファイルを置くだけ
- `published: false` で下書き管理が可能
- 記事数が増えてきたら `@next/mdx` への移行でReactコンポーネントも使えるようになる
- 将来的にサイドバーや検索が必要になった場合は Velite / Fumadocs を検討

---

## 対象外（スコープ外）

- 管理画面からの記事編集（Markdownファイルを直接編集する運用）
- コメント・いいね機能
- 全文検索
- RSS配信
