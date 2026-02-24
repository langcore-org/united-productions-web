# Vercel デプロイスピード最適化調査

> **調査日**: 2026-02-24  
> **調査対象**: Teddy プロジェクトの Vercel デプロイ時間短縮

---

## 現状分析

### 現在のビルド設定

| 項目 | 現在の設定 | 備考 |
|-----|-----------|------|
| Build Command | `prisma generate && next build` | vercel.json で設定 |
| Install Command | `npm ci` | 標準設定 |
| Node.js バージョン | 未指定 | package.json で `>=20.0.0` |
| リージョン | `hnd1` (東京) | 最適 |

### パッケージ規模

| 指標 | 値 | 評価 |
|-----|-----|------|
| package-lock.json | 14,675 行 | 中規模 |
| node_modules サイズ | 1.2GB | 大きめ |
| 依存パッケージ数 | 51 (prod) + 23 (dev) | 多め |

### Prisma スキーマ規模

- モデル数: 15個
- 行数: 329行
- Prisma Client 生成時間: 推定 5-15秒

---

## 最適化策まとめ

### 1. Vercel Remote Cache (Turborepo)

#### 効果
- **ビルド時間短縮**: 50-80%削減（キャッシュヒット時）
- **チーム全体で共有**: 同じブランチ/PR間でキャッシュ共有

#### 導入方法

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {
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
    "build:vercel": "prisma generate && turbo run build"
  }
}
```

```bash
# Vercel Dashboard で環境変数設定
TURBO_TOKEN=<your-token>
TURBO_TEAM=<your-team>
TURBO_REMOTE_CACHE_SIGNATURE_KEY=<optional-signature-key>
```

#### コスト
- Vercel Pro プラン: 無料で Remote Cache 利用可能
- Hobby プラン: 非対応

#### 優先度: ⭐⭐⭐⭐⭐ (最優先)

---

### 2. Prisma Client 生成の最適化

#### 現状の問題
- 毎回 `prisma generate` を実行している
- スキーマ変更がない場合でも再生成

#### 改善策

```json
// vercel.json
{
  "buildCommand": "if [ -d node_modules/.prisma/client ]; then echo 'Prisma Client already exists'; else prisma generate; fi && next build"
}
```

または、Vercel の Build Cache を活用:

```json
// package.json
{
  "scripts": {
    "postinstall": "prisma generate",
    "vercel-build": "next build"
  }
}
```

#### 代替案: Prisma Accelerate
- 接続プーリングで起動時間短縮
- エッジ対応でコールドスタート改善

#### 優先度: ⭐⭐⭐⭐

---

### 3. 依存関係の最適化

#### 重複・未使用パッケージの確認

```bash
# 未使用パッケージ検出（既に knip で実施済み）
npm run knip

# 重複パッケージ確認
npm ls --depth=0
```

#### 改善候補

| パッケージ | 状況 | アクション |
|-----------|------|-----------|
| `langchain` | 現在使用せず | 削除検討 |
| `@langchain/*` | 現在使用せず | 削除検討 |
| `radix-ui` | `@radix-ui/react-tabs` と重複 | 統合検討 |

#### 優先度: ⭐⭐⭐

---

### 4. Next.js ビルド最適化

#### 既存の設定（next.config.ts）

```typescript
experimental: {
  parallelServerBuildTraces: true,
  parallelServerCompiles: true,
}
```

✅ 並列ビルドは既に有効

#### 追加検討事項

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // SWC 最適化（デフォルトで有効）
  swcMinify: true,
  
  // 画像最適化
  images: {
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
  },
  
  // 型チェックの分離（CIで実行）
  typescript: {
    ignoreBuildErrors: process.env.CI !== "true",
  },
  
  // ESLint の分離
  eslint: {
    ignoreDuringBuilds: true, // CIで別途実行
  },
}
```

#### 優先度: ⭐⭐⭐

---

### 5. Node.js バージョン固定

```json
// package.json
{
  "engines": {
    "node": "20.x"
  }
}
```

または Vercel ダッシュボードで設定

#### 効果
- バージョン解決時間の短縮
- 再現性の向上

#### 優先度: ⭐⭐

---

### 6. インストール高速化

#### npm ci → pnpm 移行検討

| 項目 | npm | pnpm |
|-----|-----|------|
| インストール速度 | 標準 | 2-3倍高速 |
| ディスク使用量 | 大 | 小（ハードリンク） |
| 厳格な依存 | 標準 | 厳格（幽灵依存防止） |

```bash
# pnpm への移行
npm install -g pnpm
pnpm import
rm package-lock.json
```

```json
// vercel.json
{
  "installCommand": "pnpm install"
}
```

#### 優先度: ⭐⭐⭐ (大きな変更)

---

## 実装優先順位

### Phase 1: 即座に実装可能（1-2日）

1. **Node.js バージョン固定** - リスクなし
2. **ESLint/TypeScript の分離** - CIでカバーしている前提
3. **Prisma 生成の条件付き実行** - 軽微な変更

### Phase 2: 中期的な改善（1週間）

4. **Vercel Remote Cache 導入** - 効果大、Proプラン必要
5. **未使用パッケージ削除** - `langchain` 関連

### Phase 3: 大きな変更（要計画）

6. **pnpm 移行** - ロックファイル変更、チーム全体の合意必要

---

## 期待される効果

| 施策 | 期待効果 | 実装難易度 |
|-----|---------|-----------|
| Remote Cache | 50-80%短縮 | 中 |
| Prisma 最適化 | 5-15秒短縮 | 低 |
| パッケージ整理 | 10-30秒短縮 | 低 |
| pnpm 移行 | 30-50%短縮 | 高 |

**総合効果**: 現在のビルド時間が 2-3分の場合 → 30-60秒に短縮可能

---

## 関連ドキュメント

- [Vercel Remote Cache 公式](https://vercel.com/docs/concepts/monorepos/remote-caching)
- [Turborepo ドキュメント](https://turbo.build/repo/docs)
- [Prisma Accelerate](https://www.prisma.io/data-platform/accelerate)
