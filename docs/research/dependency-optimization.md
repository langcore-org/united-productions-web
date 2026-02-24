# 依存関係最適化調査

> **調査日**: 2026-02-24  
> **目的**: パッケージサイズ削減によるデプロイスピード向上

---

## 現状のパッケージ構成

### インストールサイズ

| 項目 | サイズ | 備考 |
|-----|--------|------|
| node_modules | 1.2GB | 大きめ |
| package-lock.json | 14,675 行 | 中規模 |

### 依存関係の内訳

```
dependencies:     51 パッケージ
devDependencies:  23 パッケージ
合計:             74 パッケージ
```

---

## knip 分析結果

### 未使用依存関係（削除候補）

| パッケージ | 種別 | サイズ推定 | 削除影響 |
|-----------|------|-----------|---------|
| `langchain` | prod | ~50MB | **削除可能** - 現在使用せず |
| `@langchain/core` | prod | ~5MB | **削除可能** - langchain依存 |
| `@langchain/openai` | prod | ~2MB | **削除可能** - langchain依存 |
| `@langchain/anthropic` | prod | ~2MB | **削除可能** - langchain依存 |
| `@upstash/redis` | prod | ~500KB | **要確認** - キャッシュ機能で使用？ |

**合計削減見込み**: ~60MB + 依存関係

### 未使用 devDependencies

| パッケージ | 用途 | 削除可否 |
|-----------|------|---------|
| `@types/bcryptjs` | 型定義 | **削除可能** - bcryptjs未使用 |
| `@types/file-saver` | 型定義 | **削除可能** - file-saver未使用 |
| `@types/uuid` | 型定義 | **削除可能** - uuid未使用 |
| `shadcn` | CLIツール | **削除可能** - 初期セットアップ後不要 |
| `tailwindcss` | v4移行済 | **削除可能** - v4は別パッケージ |
| `tw-animate-css` | アニメーション | **要確認** - 使用箇所確認必要 |

### 未使用ファイル（41ファイル）

主要な未使用ファイル:

| ファイル | 種別 | 内容 |
|---------|------|------|
| `lib/llm/langchain/*` | ライブラリ | LangChain実装（未使用） |
| `lib/cache/redis.ts` | キャッシュ | Redisキャッシュ（未使用） |
| `hooks/use-llm.ts` | フック | LLMフック（未使用） |
| `components/ui/ModelSelector.tsx` | UI | モデル選択（未使用） |

---

## 重複パッケージ分析

### UI コンポーネント関連

```
radix-ui           ^1.4.3  (メタパッケージ - 全コンポーネント)
@radix-ui/react-tabs ^1.1.13 (個別インストール)
```

**状況**: `radix-ui` がメタパッケージで `@radix-ui/react-tabs` を含む  
**推奨**: 使用しているコンポーネントのみ個別インストールに統一

### LangChain 関連

```
langchain          ^1.2.25
@langchain/core    ^1.1.27
@langchain/openai  ^1.2.9
@langchain/anthropic ^1.3.19
```

**状況**: xAI直接実装に移行済み、LangChainは未使用  
**推奨**: 削除（将来Gemini追加時に再検討）

---

## 最適化アクションプラン

### Phase 1: 安全に削除可能（即座に実行）

#### 1. LangChain 関連の削除

```bash
# 削除コマンド
npm uninstall langchain @langchain/core @langchain/openai @langchain/anthropic
```

**影響範囲**: 
- `lib/llm/langchain/` ディレクトリ（未使用）
- `types/langchain.d.ts`（あれば）

**リスク**: 低（使用していないため）

#### 2. 未使用型定義の削除

```bash
npm uninstall -D @types/bcryptjs @types/file-saver @types/uuid
```

**リスク**: なし

#### 3. shadcn CLI の削除

```bash
npm uninstall -D shadcn
```

**リスク**: 低（セットアップ後は不要）

### Phase 2: 要確認（慎重に実行）

#### 4. @upstash/redis の確認

```bash
# 使用箇所を検索
grep -r "@upstash/redis" --include="*.ts" --include="*.tsx" lib/ app/
grep -r "Redis" --include="*.ts" --include="*.tsx" lib/ app/
```

**判断基準**:
- 使用箇所がない → 削除
- `lib/cache/redis.ts` のみ → ファイルごと削除

#### 5. Tailwind CSS v4 の確認

```bash
# 現在のTailwind設定を確認
cat postcss.config.mjs
cat tailwind.config.ts 2>/dev/null || echo "No tailwind.config.ts"
```

**状況**: v4 は `postcss.config.mjs` で設定  
**推奨**: `tailwindcss` v3 パッケージは削除可能

### Phase 3: 未使用ファイルの整理

#### 6. LangChain 関連ファイルの削除

```bash
# 削除対象
rm -rf lib/llm/langchain/
rm -f lib/cache/redis.ts
rm -f hooks/use-llm.ts
rm -f hooks/useThinkingSteps.ts
```

#### 7. 未使用コンポーネントの削除

```bash
# 削除対象（ knip で検出されたもの）
rm -f components/ui/ModelSelector.tsx
rm -f components/ui/LLMSelector.tsx
rm -f components/ui/FeatureButtons.tsx
rm -f components/ui/ExportButton.tsx
rm -f components/ui/EmptyState.tsx
rm -f components/ui/AttachmentMenu.tsx
rm -f components/ui/dropdown-menu.tsx
rm -f components/ui/slider.tsx
rm -f components/ui/switch.tsx
```

---

## 期待される効果

### パッケージサイズ削減

| 施策 | 削減サイズ | インストール時間短縮 |
|-----|-----------|-------------------|
| LangChain削除 | ~60MB | 10-20秒 |
| 型定義削除 | ~1MB | 1-2秒 |
| 未使用ファイル削除 | - | ビルド時間短縮 |
| **合計** | **~60MB+** | **15-30秒** |

### ビルド時間への影響

- パッケージ数減少 → node_modules 解決時間短縮
- 未使用ファイル削除 → TypeScript コンパイル時間短縮
- バンドルサイズ削減 → 最適化時間短縮

**推定効果**: ビルド時間 5-10% 短縮

---

## 実装手順

```bash
# 1. バックアップブランチ作成
git checkout -b chore/optimize-dependencies

# 2. パッケージ削除
npm uninstall langchain @langchain/core @langchain/openai @langchain/anthropic
npm uninstall -D @types/bcryptjs @types/file-saver @types/uuid shadcn

# 3. 未使用ファイル削除（手動で確認しながら）
# lib/llm/langchain/ ディレクトリ
# lib/cache/redis.ts
# など

# 4. 動作確認
npm install
npm run build
npm run test

# 5. knip で再確認
npm run knip

# 6. コミット
git add .
git commit -m "chore: remove unused dependencies and files"
```

---

## リスク管理

### ロールバック準備

```bash
# 削除前の状態をタグ付け
git tag before-dependency-cleanup
git push origin before-dependency-cleanup
```

### 検証項目

- [ ] `npm run build` が成功
- [ ] `npm run test` が成功
- [ ] `npm run lint` が成功
- [ ] 主要機能の動作確認（認証、チャット、書き起こし）

---

## 関連ドキュメント

- [knip ドキュメント](https://knip.dev/)
- [npm prune](https://docs.npmjs.com/cli/v10/commands/npm-prune)
- [Vercel Build Cache](https://vercel.com/docs/concepts/deployments/build-cache)
