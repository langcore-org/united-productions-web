# パフォーマンス仕様

> **パフォーマンス基準と最適化方針**
> 
> **最終更新**: 2026-02-20 13:16

---

## パフォーマンス目標

### Web Vitals

| 指標 | 目標 | 許容最大値 | 計測方法 |
|-----|------|-----------|---------|
| First Contentful Paint (FCP) | < 1.0s | < 1.8s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.0s | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | < 3.8s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.05 | < 0.1 | Lighthouse |
| First Input Delay (FID) | < 50ms | < 100ms | Web Vitals |

### APIレスポンス

| エンドポイント | p50 | p95 | p99 |
|--------------|-----|-----|-----|
| 静的ページ | < 100ms | < 200ms | < 500ms |
| API（DB参照） | < 100ms | < 300ms | < 500ms |
| API（DB書込） | < 200ms | < 500ms | < 1s |
| LLM初回レスポンス | < 2s | < 5s | < 10s |
| ファイルアップロード | < 1s | < 3s | < 5s |

### バンドルサイズ

| 指標 | 目標 | 警告 | 上限 |
|-----|------|------|------|
| First Load JS | < 200KB | 200-300KB | > 300KB |
| ページ別 JS | < 100KB | 100-200KB | > 200KB |
| 画像（1枚） | < 100KB | 100-500KB | > 500KB |

---

## 最適化戦略

### フロントエンド

#### 1. Server Components の活用

```typescript
// ✅ データ取得はServer Componentで
async function ResearchPage() {
  const history = await getChatHistory('research-cast');
  return <ResearchClient initialData={history} />;
}

// ✅ インタラクションはClient Componentで
"use client";
function ResearchClient({ initialData }) {
  const [messages, setMessages] = useState(initialData);
  // ...
}
```

#### 2. 画像最適化

```typescript
// ✅ next/image を使用
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Hero"
  width={800}
  height={400}
  priority  // LCP画像には必須
/>
```

#### 3. 動的インポート

```typescript
// ✅ 大きなコンポーネントは動的インポート
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false, // ブラウザAPI使用時
});
```

#### 4. リストの仮想化

```typescript
// ✅ 長いリストは仮想化
import { VirtualList } from '@/components/ui/virtual-list';

<VirtualList
  items={messages}
  renderItem={(message) => <MessageBubble message={message} />}
  itemHeight={80}
/>
```

---

### API最適化

#### 1. キャッシュ戦略

```typescript
// ✅ Next.js fetch cache
const data = await fetch('/api/data', {
  next: { revalidate: 60 } // 60秒間ISR
});

// ✅ Redis cache
import { cache } from '@/lib/cache/redis';

const result = await cache.getOrSet(
  `llm:${hash}`,
  () => callLLM(prompt),
  86400 // TTL: 24時間
);
```

#### 2. データベース最適化

```typescript
// ✅ 必要なフィールドのみ選択
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }
});

// ✅ リレーションは必要時のみ含める
const notes = await prisma.meetingNote.findMany({
  where: { userId },
  include: { user: false } // 不要なら含めない
});

// ✅ ページネーション
const notes = await prisma.meetingNote.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' }
});
```

#### 3. ストリーミング

```typescript
// ✅ LLMレスポンスはストリーミング
export async function POST(request: Request) {
  const stream = await createLLMStream(messages);
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

---

## 計測方法

### Lighthouse

```bash
# 開発サーバー起動後
npm run dev

# Lighthouse CI実行
npm run lighthouse

# または手動
npx lighthouse http://localhost:3000 --output html --output-path ./report.html
```

### Web Vitals

```typescript
// app/layout.tsx
import { WebVitals } from '@/components/web-vitals';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <WebVitals />
      </body>
    </html>
  );
}
```

### Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## パフォーマンス監視

### ログ記録

```typescript
import { logger } from '@/lib/logger';

// APIレイテンシ計測
const start = performance.now();
const result = await fetchData();
const duration = performance.now() - start;

logger.performance('API', '/api/data', {
  duration,
  status: 'success'
});
```

### アラート設定

| 条件 | アクション |
|-----|-----------|
| API p95 > 1s | Slack通知 |
| エラー率 > 1% | PagerDuty通知 |
| LCP > 2.5s | 週次レポート |

---

## パフォーマンス予算

### 新機能追加時のチェック

- [ ] First Load JS が 200KB を超えていないか
- [ ] 新規パッケージ追加は必要最小限か
- [ ] 画像は最適化されているか
- [ ] 不要な JavaScript が含まれていないか

### パフォーマンス回帰防止

```bash
# CIでのチェック
npm run build
npm run lighthouse:ci
```

---

## 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| データフロー | [./data-flow.md](./data-flow.md) |
| キャッシュ戦略 | [./data-flow.md#キャッシュ戦略](./data-flow.md#キャッシュ戦略) |
| ログ・監視 | [./logging-monitoring.md](./logging-monitoring.md) |
