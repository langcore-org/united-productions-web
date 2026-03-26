# Markdownレンダリング実装方法 調査レポート

> **調査日**: 2026年3月26日  
> **目的**: Teddyの記事表示機能を既存フレームワークで置き換える検討

---

## 候補一覧

| ランク | 候補 | タイプ | 評価 |
|--------|------|--------|------|
| 🥇 | **MDX + next-mdx-remote** | レンダリングエンジン | 最適 |
| 🥈 | **Contentlayer** | コンテンツ管理 | 検討価値あり |
| 🥉 | **Nextra** | ドキュメントフレームワーク | 過剰 |
| 4 | Markdoc | ドキュメントエンジン | 代替案 |
| 5 | Notion API | ヘッドレスCMS | 別アプローチ |

---

## 1. 🥇 MDX (mdx-js/mdx + next-mdx-remote)

### 概要
Markdown + JSXを組み合わせたフォーマット。ReactコンポーネントをMarkdown内で直接使用可能。

### メリット
- **JSX対応**: `<Button />` などのコンポーネントをMarkdown内で使用可能
- **既存のReactMarkdownと互換**: 移行コストが低い
- **next-mdx-remote**: サーバーサイドでMDXをレンダリングし、クライアントに送らない（パフォーマンス最適化）
- **カスタムコンポーネント**: 現在の実装をそのまま移行可能
- **エコシステム**: 最も活発に開発されている

### デメリット
- 導入に少し設定が必要（`@mdx-js/loader` など）
- Markdown内にJSXを使うと、編集者がHTML知識を必要とする

### 実装例
```typescript
import { MDXRemote } from 'next-mdx-remote/rsc';

// サーバーコンポーネントで直接使用
export default async function Page() {
  const source = await fetchArticle();
  return <MDXRemote source={source} components={customComponents} />;
}
```

### コスト
- 追加パッケージ: `next-mdx-remote`（軽量）
- 移行工数: **低**（現在の実装とほぼ同じ構造）

---

## 2. 🥈 Contentlayer

### 概要
型安全なコンテンツ管理フレームワーク。Markdown/MDXを型付きデータとして扱う。

### メリット
- **型安全**: TypeScriptの型が自動生成される
- **自動バリデーション**: frontmatterのスキーマ検証
- **ビルド時生成**: コンテンツをビルド時に処理（高速）
- **型補完**: VSCodeで記事の型補完が効く

### デメリット
- **開発が停滞**: 2023年以降、メンテナンスモード気味
- **セットアップ複雑**: `contentlayer.config.ts`の設定が必要
- **過剰機能**: ブログ/ドキュメント特化のため、Teddyの用途には少し重い

### 実装例
```typescript
// contentlayer.config.ts
import { defineDocumentType, makeSource } from 'contentlayer/source-files';

export const Article = defineDocumentType(() => ({
  name: 'Article',
  filePathPattern: `**/*.md`,
  fields: {
    title: { type: 'string', required: true },
    date: { type: 'date', required: true },
  },
}));
```

### コスト
- 追加パッケージ: `contentlayer`, `next-contentlayer`
- 移行工数: **中**（設定ファイルの作成が必要）

---

## 3. 🥉 Nextra

### 概要
Next.js特化のドキュメントフレームワーク。Next.js公式ドキュメントでも使用。

### メリット
- **一式揃い**: ナビゲーション、検索、ダークモード、目次など全部入り
- **Next.js公式採用**: 信頼性が高い
- **MDX対応**: MDXをネイティブサポート
- **ファイルベースルーティング**: `pages/` 配下のファイルが自動的にページになる

### デメリット
- **過剰**: ドキュメントサイト特化のため、Teddyの「ガイド記事」機能には大きすぎる
- **レイアウト制約**: Nextraのレイアウトに従う必要がある
- **カスタマイズ制限**: 既存のアプリへの統合が難しい

### 用途
- ドキュメントサイトをゼロから構築する場合
- 既存のNext.jsアプリへの埋め込みには不向き

---

## 4. Markdoc

### 概要
Stripeが開発したドキュメントエンジン。Markdownの拡張構文を持つ。

### メリット
- **セキュア**: サンドボックス化された実行環境
- **カスタムタグ**: `{% callout %}` などの独自タグが定義可能
- **Stripe採用**: Stripeのドキュメントで実績あり

### デメリット
- **独自構文**: 標準Markdownとは少し異なる
- **エコシステム**: 他より小さい
- **学習コスト**: 新しい構文を覚える必要がある

### 実装例
```markdown
{% callout type="warning" %}
これは警告メッセージです
{% /callout %}
```

---

## 5. Notion as CMS

### 概要
Notionのページをデータベースとして使用し、API経由でコンテンツを取得。

### メリット
- **編集体験**: NotionのWYSIWYG編集がそのまま使える
- **非エンジニア対応**: エンジニア以外でも記事作成可能
- **リアルタイム**: Notionを更新すれば即座に反映

### デメリット
- **API制限**: 100万件/3秒のレート制限
- **レイテンシ**: SSR時にAPIコールが必要（遅い）
- **依存**: Notionに依存

### 用途
- マーケティングブログ
- 非エンジニアが記事を頻繁に更新する場合

---

## 推奨: MDX + next-mdx-remote

### 選定理由

| 観点 | 評価 |
|------|------|
| **移行コスト** | ⭐⭐⭐ 現在の実装とほぼ同じ |
| **機能性** | ⭐⭐⭐ JSXコンポーネント埋め込み可能 |
| **パフォーマンス** | ⭐⭐⭐ サーバーコンポーネント対応 |
| **メンテナンス** | ⭐⭐⭐ 活発に開発されている |
| **シンプルさ** | ⭐⭐ 追加設定が少し必要 |

### 移行計画

1. **パッケージインストール**
   ```bash
   npm install next-mdx-remote @mdx-js/react
   ```

2. **コンポーネント移行**
   - 現在の `MarkdownContent.tsx` の `components` をそのまま流用
   - `ReactMarkdown` → `MDXRemote` に置き換え

3. **メリット**
   - 将来的に `<Callout />`、`<Steps />` などのカスタムコンポーネントをMarkdown内で使える
   - 現在のカスタム実装と比較して、メンテナンス性が向上

---

## 結論

**現状維持（カスタム実装）でも問題ないが、MDXへの移行を推奨**

- 今すぐ移行する必要はない
- ただし、カスタムコンポーネント（Callout, Tabs, Steps等）を導入したくなった時が移行のタイミング
- その時まで現状の `react-markdown` 実装で十分

### 最終推奨

```
現状: react-markdown + カスタムコンポーネント
    ↓ カスタムコンポーネントが増えてきたら
将来: next-mdx-remote + MDXコンポーネント
```
