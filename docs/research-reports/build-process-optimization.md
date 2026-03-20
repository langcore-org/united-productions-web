# ビルドプロセス最適化調査

> **調査日**: 2026-02-24  
> **目的**: Next.js + Prisma + TypeScript のビルド時間短縮

---

## 現在のビルドフロー分析

### ビルドコマンド

```bash
# vercel.json
"buildCommand": "prisma generate && next build"

# package.json
"build": "prisma generate && next build"
```

### ビルドステップ内訳（推定）

| ステップ | 推定時間 | 内容 |
|---------|---------|------|
| 1. パッケージインストール | 30-60秒 | `npm ci` |
| 2. Prisma Client 生成 | 5-15秒 | `prisma generate` |
| 3. Next.js ビルド | 60-120秒 | `next build` |
| 4. 静的ファイル生成 | 10-20秒 | SSGページ |
| **合計** | **105-215秒** | **約2-4分** |

---

## ボトルネック分析

### 1. Prisma Client 生成

#### 現状の問題
- 毎回 `prisma generate` を実行
- スキーマ変更がない場合でも再生成
- 329行のスキーマをパースしてクライアント生成

#### 最適化策

**A. 条件付き生成**

```bash
# vercel.json
{
  "buildCommand": "[ -f node_modules/.prisma/client/index.js ] || prisma generate && next build"
}
```

**B. Vercel Build Cache 活用**

```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

Vercel は `node_modules` をキャッシュするため、`postinstall` で生成した Prisma Client もキャッシュされる。

**C. Prisma Accelerate 検討**
- 接続プーリングによる起動時間短縮
- エッジ対応
- ただし、ビルド時間への影響は限定的

### 2. TypeScript コンパイル

#### 現状の設定（next.config.ts）

```typescript
typescript: {
  // CI環境以外では型エラーをチェック（本番デプロイ時は必ず検証）
  ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true",
}
```

#### 最適化策

**A. 型チェックの分離**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  typescript: {
    // Vercel上では型チェックをスキップ（CIで事前に実行）
    ignoreBuildErrors: process.env.VERCEL === "1",
  },
}
```

```yaml
# .github/workflows/ci.yml（推奨）
name: CI
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit
```

**効果**: 型チェック時間（10-30秒）を削減

**B. SWC 最適化**

Next.js 16 では SWC がデフォルトで有効。追加設定不要。

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  swcMinify: true, // デフォルトで有効
}
```

### 3. ESLint

#### 現状
- Biome を使用（高速）
- ビルド時の ESLint チェックは無効化可能

#### 最適化策

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  eslint: {
    // Biomeを使用しているため、ビルド時のESLintを無効化
    ignoreDuringBuilds: true,
  },
}
```

**効果**: ESLint 実行時間（5-10秒）を削減

---

## 並列化設定

### 既存の設定（有効）

```typescript
// next.config.ts
experimental: {
  parallelServerBuildTraces: true,
  parallelServerCompiles: true,
}
```

### 追加検討事項

**webpack 並列化**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.parallelism = 4; // CPUコア数に応じて調整
    return config;
  },
}
```

---

## 画像最適化

### 現状の設定

```typescript
// next.config.ts
images: {
  unoptimized: false, // 画像最適化を有効化
}
```

### ビルド時の最適化

ビルド時に画像最適化を行う場合:

```typescript
// next.config.ts
images: {
  unoptimized: false,
  formats: ['image/webp', 'image/avif'],
  deviceSizes: [640, 750, 828, 1080, 1200], // 必要なサイズのみ
  imageSizes: [16, 32, 48, 64, 96, 128, 256], // 必要なサイズのみ
}
```

**注意**: 画像最適化は初回アクセス時に行われるため、ビルド時間への影響は限定的

---

## 静的ページ生成（SSG）の最適化

### 動的パラメータの制限

```typescript
// app/page.tsx
export const dynamicParams = false; // 事前生成のみ

// または
export const revalidate = 3600; // ISR（1時間ごと）
```

### データフェッチの最適化

```typescript
// ✅ 並列データフェッチ
async function Page() {
  const [data1, data2, data3] = await Promise.all([
    fetchData1(),
    fetchData2(),
    fetchData3(),
  ]);
  // ...
}

// ❌ 直列データフェッチ（遅い）
async function Page() {
  const data1 = await fetchData1();
  const data2 = await fetchData2();
  const data3 = await fetchData3();
  // ...
}
```

---

## 環境変数の最適化

### 不要な環境変数の削除

```bash
# ビルド時にのみ必要な変数
NEXT_TELEMETRY_DISABLED=1  # Next.js テレメトリ無効化（ビルド速度向上）
```

### 環境変数の検証スキップ

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // 環境変数の検証をスキップ（開発時のみ使用）
  env: {
    SKIP_ENV_VALIDATION: process.env.VERCEL === "1" ? "true" : undefined,
  },
}
```

---

## 推奨設定まとめ

### 最適化後の next.config.ts

```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 型チェックはCIで実行
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
  },
  
  // ESLintはBiomeで代替
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 画像最適化
  images: {
    unoptimized: false,
    formats: ['image/webp'],
  },
  
  // 並列ビルド
  experimental: {
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  
  // SWC最適化
  swcMinify: true,
  
  // テレメトリ無効化
  telemetry: {
    disabled: true,
  },
  
  // ヘッダー設定（既存）
  async headers() {
    return [
      // ... 既存のヘッダー設定
    ];
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);
```

### 最適化後の vercel.json

```json
{
  "buildCommand": "next build",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

### 最適化後の package.json

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build",
    "vercel-build": "next build"
  }
}
```

---

## 期待される効果

| 最適化 | 時間短縮 | 備考 |
|-------|---------|------|
| Prisma 条件付き生成 | 5-15秒 | キャッシュヒット時 |
| 型チェック分離 | 10-30秒 | CIで実行 |
| ESLint無効化 | 5-10秒 | Biomeで代替 |
| テレメトリ無効化 | 2-5秒 | |
| **合計** | **22-60秒** | **約20-30%短縮** |

---

## 実装手順

```bash
# 1. ブランチ作成
git checkout -b chore/optimize-build

# 2. next.config.ts の更新
# （上記の推奨設定を適用）

# 3. package.json の更新
# postinstall スクリプト追加

# 4. vercel.json の更新
# buildCommand から prisma generate を削除

# 5. 動作確認
npm install
npm run build

# 6. コミット
git add .
git commit -m "chore: optimize build process"
```

---

## 関連ドキュメント

- [Next.js Build Optimization](https://nextjs.org/docs/advanced-features/compiler)
- [Prisma Generate](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [Vercel Build Step](https://vercel.com/docs/concepts/deployments/build-step)
