# パフォーマンス仕様

> **パフォーマンス基準と最適化方針**

## Core Web Vitals目標

| 指標 | 目標値 | 許容値 |
|-----|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | < 4.0s |
| INP (Interaction to Next Paint) | < 200ms | < 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 |
| TTFB (Time to First Byte) | < 600ms | < 1.0s |

## 最適化戦略

### 画像

- Next.js Imageコンポーネント使用
- WebP/AVIF形式優先
- レスポンシブ画像（srcset）

### コード分割

- 動的インポート（`next/dynamic`）
- ルートベースの自動分割

### データフェッチ

| 戦略 | 用途 |
|-----|------|
| SSG | 静的コンテンツ（設定ページ等） |
| SSR | 認証が必要な動的コンテンツ |
| ISR | 頻繁に更新される公開コンテンツ |
| Client Fetch | リアルタイム性が必要なデータ |

### キャッシュ

| レイヤー | 方法 | 詳細 |
|---------|------|------|
| LLMレスポンス | Upstash Redis | [llm-integration.md](./llm-integration.md#キャッシュ) |
| APIレスポンス | Next.js fetch cache | `cache: 'force-cache'` |
| 静的アセット | CDN | Vercel Edge Network |

## バンドルサイズ監視

- `next/bundle-analyzer` で定期確認
- 目標: First Load JS < 200KB

## データベース最適化

- N+1問題対策: `include` で一括取得
- インデックス: 詳細は [database-schema.md](./database-schema.md#インデックス)

## 監視

- Vercel AnalyticsでCWV測定
- 詳細: [logging-monitoring.md](./logging-monitoring.md)
