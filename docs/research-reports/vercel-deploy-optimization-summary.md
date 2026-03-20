# Vercel デプロイスピード最適化 総合レポート

> **調査日**: 2026-02-24  
> **作成者**: AI Assistant  
> **目的**: Teddy プロジェクトの Vercel デプロイ時間短縮のための包括的な最適化計画

---

## エグゼクティブサマリー

### 現状の課題
- 現在のデプロイ時間: **約2-4分**（推定）
- node_modules サイズ: **1.2GB**
- 未使用パッケージ: **langchain 関連（約60MB）**

### 目標
- **短期目標**: 20-30% 短縮（30-60秒）
- **中期目標**: 50% 短縮（1-2分）
- **長期目標**: 70% 短縮（1分未満）

### 期待される効果
| フェーズ | 実装工数 | 効果 | 優先度 |
|---------|---------|------|--------|
| Phase 1 | 1-2日 | 20-30%短縮 | ⭐⭐⭐⭐⭐ |
| Phase 2 | 1週間 | 50%短縮 | ⭐⭐⭐⭐ |
| Phase 3 | 2週間 | 70%短縮 | ⭐⭐⭐ |

---

## 詳細調査ドキュメント一覧

| ドキュメント | 内容 | リンク |
|-------------|------|--------|
| Vercelデプロイスピード最適化調査 | Remote Cache、Prisma最適化、パッケージ整理 | [vercel-deploy-speed-optimization.md](./vercel-deploy-speed-optimization.md) |
| 依存関係最適化調査 | 未使用パッケージ分析、削除手順 | [dependency-optimization.md](./dependency-optimization.md) |
| ビルドプロセス最適化調査 | TypeScript/ESLint分離、並列化 | [build-process-optimization.md](./build-process-optimization.md) |
| Vercel固有の最適化調査 | Edge Runtime、ISR、Build Cache | [vercel-specific-optimizations.md](./vercel-specific-optimizations.md) |

---

## 最適化施策一覧

### Phase 1: 即座に実装可能（1-2日）

#### 1.1 未使用パッケージの削除 ⭐⭐⭐⭐⭐

**対象パッケージ**:
```bash
# 削除対象
npm uninstall langchain @langchain/core @langchain/openai @langchain/anthropic
npm uninstall -D @types/bcryptjs @types/file-saver @types/uuid shadcn
```

**効果**:
- パッケージサイズ: ~60MB削減
- インストール時間: 10-20秒短縮
- ビルド時間: 5-10%短縮

**実装手順**:
```bash
git checkout -b chore/remove-unused-deps
npm uninstall langchain @langchain/core @langchain/openai @langchain/anthropic
npm uninstall -D @types/bcryptjs @types/file-saver @types/uuid shadcn
npm install
npm run build
npm run test
git add . && git commit -m "chore: remove unused dependencies"
```

#### 1.2 ビルド設定の最適化 ⭐⭐⭐⭐

**変更内容**:
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1", // CIでチェック
  },
  eslint: {
    ignoreDuringBuilds: true, // Biomeで代替
  },
}
```

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
  "buildCommand": "next build",
  "cacheDirectories": ["node_modules", ".next/cache", "node_modules/.prisma/client"]
}
```

**効果**:
- Prisma生成時間: 5-15秒短縮（キャッシュヒット時）
- 型チェック時間: 10-30秒短縮
- ESLint時間: 5-10秒短縮

#### 1.3 Node.js バージョン固定 ⭐⭐

```json
// package.json
{
  "engines": {
    "node": "20.x"
  }
}
```

---

### Phase 2: 中期的な改善（1週間）

#### 2.1 Vercel Remote Cache 導入 ⭐⭐⭐⭐⭐

**要件**:
- Vercel Pro プラン

**設定**:
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    }
  }
}
```

```bash
# 環境変数（Vercel Dashboard）
TURBO_TOKEN=<token>
TURBO_TEAM=<team>
```

**効果**:
- 2回目以降のビルド: 50-80%短縮
- チーム全体でキャッシュ共有

#### 2.2 未使用ファイルの整理 ⭐⭐⭐

**削除対象**（knipで検出）:
```bash
rm -rf lib/llm/langchain/
rm -f lib/cache/redis.ts
rm -f hooks/use-llm.ts
rm -f components/ui/ModelSelector.tsx
rm -f components/ui/LLMSelector.tsx
# ... その他41ファイル
```

**効果**:
- TypeScriptコンパイル時間短縮
- バンドルサイズ削減

#### 2.3 Edge Runtime の活用 ⭐⭐⭐

**対象API**:
```typescript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

**効果**:
- コールドスタート: 100-500ms → 0-50ms
- 軽量APIの応答時間短縮

---

### Phase 3: 大きな変更（2週間）

#### 3.1 pnpm への移行 ⭐⭐⭐

**効果**:
- インストール速度: 2-3倍高速
- ディスク使用量: 大幅削減
- 厳格な依存管理

**移行手順**:
```bash
npm install -g pnpm
pnpm import
rm package-lock.json
# vercel.json: "installCommand": "pnpm install"
```

#### 3.2 ISR の積極的活用 ⭐⭐⭐

**対象ページ**:
```typescript
// 動的コンテンツ
export const revalidate = 3600;

// 静的パラメータの制限
export const dynamicParams = false;
```

**効果**:
- ビルド時の静的生成削減
- 最新データの反映

---

## 実装ロードマップ

### Week 1

| 日 | タスク | 担当 | 成果物 |
|---|--------|------|--------|
| 月 | 未使用パッケージ削除 | - | PR作成 |
| 火 | ビルド設定最適化 | - | PR作成 |
| 水 | Phase 1 PR レビュー・マージ | - | mainブランチ反映 |
| 木 | 効果測定 | - | ビルド時間比較 |
| 金 | Remote Cache 調査 | - | 導入計画 |

### Week 2

| 日 | タスク | 担当 | 成果物 |
|---|--------|------|--------|
| 月 | Remote Cache 導入 | - | PR作成 |
| 火 | 未使用ファイル整理 | - | PR作成 |
| 水 | Phase 2 PR レビュー・マージ | - | mainブランチ反映 |
| 木 | 効果測定 | - | ビルド時間比較 |
| 金 | ドキュメント更新 | - | 最終レポート |

---

## 効果測定方法

### ビルド時間の記録

```bash
# ビルド時間計測
time npm run build

# Vercelデプロイ時間確認
npm run deploy:status
```

### 測定項目

| 項目 | 測定方法 | 目標値 |
|-----|---------|--------|
| インストール時間 | Vercelログ | 30-60秒 |
| ビルド時間 | Vercelログ | 30-60秒 |
| 総デプロイ時間 | Vercelダッシュボード | < 2分 |
| キャッシュヒット率 | Turborepoログ | > 80% |

### 測定スケジュール

- **Phase 1 実施前**: ベースライン測定
- **Phase 1 実施後**: 効果測定
- **Phase 2 実施後**: 効果測定
- **週次**: 継続的な監視

---

## リスク管理

### リスク一覧

| リスク | 確率 | 影響 | 対策 |
|-------|------|------|------|
| パッケージ削除による機能破損 | 低 | 高 | 十分なテスト、段階的削除 |
| Remote Cache の設定ミス | 中 | 中 | ドキュメント確認、テスト |
| ビルド設定変更によるエラー | 中 | 高 | CIパイプラインでの検証 |
| pnpm 移行による互換性問題 | 低 | 中 | 移行前の十分な検証 |

### ロールバック計画

```bash
# タグ付け（各Phase実施前）
git tag before-phase-1
git tag before-phase-2

# ロールバック
git revert HEAD
# または
git checkout before-phase-1
```

---

## コスト見積もり

### 追加コスト

| 項目 | コスト | 備考 |
|-----|--------|------|
| Vercel Pro プラン | $20/月 | Remote Cache に必要 |
| Turborepo | 無料 | Proプランに含まれる |
| 開発工数 | 2-3日 | Phase 1-2 |

### コスト削減効果

| 項目 | 効果 |
|-----|------|
| ビルド時間短縮 | 開発者の待ち時間削減 |
| キャッシュ活用 | ビルドリソースの節約 |

---

## まとめ

### 推奨アクション（優先順位順）

1. **即座に実施**: 未使用パッケージ削除（langchain関連）
2. **即座に実施**: ビルド設定の最適化
3. **1週間以内**: Vercel Remote Cache 導入検討
4. **1週間以内**: 未使用ファイルの整理
5. **1ヶ月以内**: pnpm 移行検討

### 期待される最終成果

| フェーズ | 実装後のビルド時間 | 累積効果 |
|---------|-----------------|---------|
| 現状 | 2-4分 | - |
| Phase 1 | 1.5-3分 | 20-30%短縮 |
| Phase 2 | 1-2分 | 50%短縮 |
| Phase 3 | < 1分 | 70%短縮 |

---

## 関連リンク

- [Vercelデプロイスピード最適化調査](./vercel-deploy-speed-optimization.md)
- [依存関係最適化調査](./dependency-optimization.md)
- [ビルドプロセス最適化調査](./build-process-optimization.md)
- [Vercel固有の最適化調査](./vercel-specific-optimizations.md)
- [Vercel Remote Cache 公式](https://vercel.com/docs/concepts/monorepos/remote-caching)
- [Next.js Build Optimization](https://nextjs.org/docs/advanced-features/compiler)

---

## 更新履歴

| 日付 | 内容 | 担当 |
|-----|------|------|
| 2026-02-24 | 初版作成 | AI Assistant |
