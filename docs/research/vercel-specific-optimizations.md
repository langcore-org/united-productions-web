# Vercel 固有の最適化調査

> **調査日**: 2026-02-24  
> **目的**: Vercel プラットフォーム固有の機能を活用したデプロイ最適化

---

## Vercel プラットフォームの仕様

### 現在の設定

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

### ビルド環境

| 項目 | 仕様 | 備考 |
|-----|------|------|
| Build Container | Linux x86_64 | |
| Node.js | デフォルト 18.x | package.json で上書き可能 |
| メモリ | 1024MB (Hobby) / 8192MB (Pro) | |
| ビルド時間制限 | 45分 | |
| 同時ビルド | 1 (Hobby) / 6 (Pro) | |

---

## 1. Vercel Remote Cache

### 概要
Turborepo の Remote Cache 機能を Vercel で利用可能。

### 仕組み
```
ビルド1 → キャッシュ生成 → Vercel Remote Cache
                ↓
ビルド2 → キャッシュヒット → ビルドスキップ
```

### 導入要件
- Vercel Pro プラン以上
- Turborepo の設定

### 設定方法

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**"
      ],
      "env": [
        "NEXTAUTH_SECRET",
        "DATABASE_URL"
      ]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "outputs": []
    }
  }
}
```

```json
// package.json
{
  "scripts": {
    "build": "turbo run build",
    "build:vercel": "turbo run build --remote-only"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

```bash
# Vercel Dashboard → Project Settings → Environment Variables
TURBO_TOKEN=<vercel-token>
TURBO_TEAM=<team-slug>
```

### 効果
- **初回ビルド**: 通常通り
- **2回目以降**: 50-80% 時間短縮
- **チーム共有**: 同じブランチ間でキャッシュ共有

### コスト
| プラン | Remote Cache | 備考 |
|-------|--------------|------|
| Hobby | ❌ 非対応 | |
| Pro | ✅ 無料 | チーム全体で共有 |
| Enterprise | ✅ 無制限 | |

---

## 2. Vercel Build Cache

### 概要
Vercel 独自のビルドキャッシュ機能。

### キャッシュ対象
- `node_modules`
- `.next/cache`
- カスタムキャッシュディレクトリ

### 設定方法

```json
// vercel.json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "cacheDirectories": [
    "node_modules",
    ".next/cache",
    "node_modules/.prisma/client"
  ]
}
```

### Prisma Client のキャッシュ活用

```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

```json
// vercel.json
{
  "buildCommand": "next build"
}
```

`postinstall` で生成した Prisma Client は `node_modules` と共にキャッシュされる。

---

## 3. リージョン最適化

### 現在の設定
```json
"regions": ["hnd1"]
```

### リージョン一覧

| リージョン | コード | 場所 |
|-----------|--------|------|
| 東京 | hnd1 | 日本 |
| シンガポール | sin1 | 東南アジア |
| サンフランシスコ | sfo1 | 米国西海岸 |
| ワシントン | iad1 | 米国東海岸 |
| フランクフルト | fra1 | 欧州 |

### 推奨設定
- ユーザーが日本に集中 → `hnd1`（現在の設定で最適）
- グローバル展開 → `["hnd1", "iad1", "fra1"]`

---

## 4. Edge Runtime の活用

### 概要
Vercel Edge Network で実行される軽量ランタイム。

### 特徴
| 項目 | Node.js | Edge |
|-----|---------|------|
| 起動時間 | 100-500ms | 0-50ms |
| コールドスタート | あり | ほぼなし |
| メモリ | 1024MB+ | 128MB |
| 実行時間 | 60秒 (Hobby) / 300秒 (Pro) | 30秒 |

### 適用候補

```typescript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

```typescript
// app/api/search/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  // 軽量な検索処理
  const results = await searchCache(query);
  
  return Response.json(results);
}
```

### 制約
- Node.js API が使えない
- Prisma Client は Accelerate が必要
- ファイルシステムアクセス不可

---

## 5. ISR (Incremental Static Regeneration)

### 概要
ビルド時ではなく、リクエスト時に静的ページを生成・更新。

### 設定方法

```typescript
// app/page.tsx
export const revalidate = 3600; // 1時間ごと

export default async function Page() {
  const data = await fetchData();
  return <Dashboard data={data} />;
}
```

### 効果
- ビルド時間短縮（静的ページ生成の削減）
- 最新データの反映

---

## 6. Vercel Analytics & Speed Insights

### 概要
パフォーマンス計測ツール。

### 設定

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 効果
- Core Web Vitals の計測
- パフォーマンスボトルネックの特定

---

## 7. 環境変数の最適化

### ビルド時 vs ランタイム

```bash
# ビルド時に必要
NEXT_PUBLIC_API_URL=https://api.example.com

# ランタイムに必要（Server-side only）
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
```

### 環境変数の数を最小化

```bash
# ❌ 無駄な環境変数
DEBUG=true
VERBOSE_LOGGING=true
DEVELOPMENT_MODE=false

# ✅ 必要最小限
NODE_ENV=production
NEXTAUTH_SECRET=...
DATABASE_URL=...
```

---

## 8. デプロイフックの活用

### 概要
特定の条件でのみビルドを実行。

### 設定

```json
// vercel.json
{
  "buildCommand": "next build",
  "installCommand": "npm ci",
  "github": {
    "silent": true,  // PRコメントを無効化
    "autoJobCancelation": true  // 新しいデプロイで古いものをキャンセル
  }
}
```

---

## 9. プレビューデプロイの最適化

### 概要
PRごとのプレビュー環境。

### コスト削減策

```json
// vercel.json
{
  "buildCommand": "if [ \"$VERCEL_ENV\" = \"preview\" ]; then echo 'Skipping build for preview'; exit 0; fi && next build"
}
```

または、特定のブランチのみプレビュー:

```json
// vercel.json
{
  "github": {
    "enabled": false
  }
}
```

Vercel Dashboard で手動設定:
- Settings → Git → Deploy Hooks

---

## 10. 推奨設定まとめ

### vercel.json（最適化版）

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "next build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "cacheDirectories": [
    "node_modules",
    ".next/cache",
    "node_modules/.prisma/client"
  ],
  "github": {
    "silent": true,
    "autoJobCancelation": true
  }
}
```

### package.json（最適化版）

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build",
    "vercel-build": "next build"
  }
}
```

### 環境変数（Vercel Dashboard）

```bash
# 必須
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Remote Cache（Proプラン）
TURBO_TOKEN=<token>
TURBO_TEAM=<team>
```

---

## 期待される効果

| 最適化 | 効果 | 適用条件 |
|-------|------|---------|
| Remote Cache | 50-80%短縮 | Proプラン |
| Build Cache | 10-20%短縮 | 全プラン |
| Edge Runtime | コールドスタート削減 | 特定API |
| ISR | ビルド時間短縮 | 動的コンテンツ |
| 環境変数最適化 | 軽微 | 全プラン |

---

## 関連ドキュメント

- [Vercel Build Cache](https://vercel.com/docs/concepts/deployments/build-cache)
- [Vercel Remote Cache](https://vercel.com/docs/concepts/monorepos/remote-caching)
- [Edge Runtime](https://vercel.com/docs/concepts/functions/edge-functions)
- [ISR](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
