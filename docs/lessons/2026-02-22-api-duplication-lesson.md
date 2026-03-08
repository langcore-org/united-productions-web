# 重複API解消方針

> **調査日**: 2026-02-22  
> **対応完了日**: 2026-02-22  
> **カテゴリ**: アーキテクチャ  
> **移動元**: `docs/archive/duplicate-api-resolution.md`  
> **統合日**: 2026-02-26  
> **対象**: `/api/llm/langchain`, `/api/llm/langchain/stream`

---

## 現状分析

### `/api/llm/langchain` vs `/api/llm/chat`

| 項目 | `/api/llm/langchain` | `/api/llm/chat` |
|------|---------------------|-----------------|
| **目的** | LangChain版チャットAPI | 標準チャットAPI |
| **実装** | LangChain使用 | LangChain使用（同じ） |
| **リクエスト形式** | 同じ | 同じ |
| **レスポンス形式** | 同じ | 同じ |
| **使用量追跡** | ❌ なし | ✅ あり (`trackUsage`) |
| **デフォルトプロバイダー** | `DEFAULT_PROVIDER`定数 | `getDefaultLLMProvider()`動的取得 |
| **リクエストID接頭辞** | `lc_` | `chat_` |
| **使用状況** | ❌ 未使用 | ✅ 使用中 (`hooks/use-llm.ts`) |

**結論**: 機能的に完全に重複。`/api/llm/chat` の方が使用量追跡機能があり、より完成度が高い。

---

### `/api/llm/langchain/stream` vs `/api/llm/stream`

| 項目 | `/api/llm/langchain/stream` | `/api/llm/stream` |
|------|----------------------------|-------------------|
| **実装** | `../../stream/route` からのリエクスポートのみ | 実装本体 |
| **コード行数** | 9行 | 138行 |
| **使用状況** | ❌ 未使用 | ✅ 使用中 (`hooks/use-llm.ts`, `components/ui/StreamingMessage.tsx`) |

**結論**: 完全なリエクスポート。不要。

---

## 推奨対応

### 方針: `/api/llm/langchain/*` を削除し、`/api/llm/chat` と `/api/llm/stream` を標準化

```
削除対象:
├── app/api/llm/langchain/
│   ├── route.ts          ← 削除
│   └── stream/
│       └── route.ts      ← 削除
```

---

## 削除手順

### Step 1: 削除前の確認

以下のファイルから `/api/llm/langchain` への参照がないことを確認：

```bash
# 検索コマンド
grep -r "llm/langchain" /home/koyomaru/agent1 --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

**確認結果**: フロントエンドからの参照なし（`hooks/use-llm.ts` は `/api/llm/chat` と `/api/llm/stream` を使用）

---

### Step 2: ファイル削除

```bash
# 削除対象ディレクトリ
rm -rf /home/koyomaru/agent1/app/api/llm/langchain
```

---

### Step 3: 関連ドキュメントの更新

#### `docs/specs/api-specification.md`
```markdown
# 削除または非推奨としてマーク

## ~~POST /api/llm/langchain~~ (削除済み)
~~LangChain版チャット完了エンドポイント~~

**代替**: `POST /api/llm/chat`

## ~~POST /api/llm/langchain/stream~~ (削除済み)
~~LangChain版ストリーミングエンドポイント~~

**代替**: `POST /api/llm/stream`
```

---

## 影響範囲

### 影響なし（削除可能）
- ✅ フロントエンドから `/api/llm/langchain` への呼び出しなし
- ✅ テストからの呼び出しなし
- ✅ 他のAPIからの呼び出しなし

### 注意点
- `lib/llm/langchain/` ディレクトリは **削除しない**（基盤ライブラリとして使用）
- 削除するのは `app/api/llm/langchain/` エンドポイントのみ

---

## 代替APIの使用方法

### 非同期チャット
```typescript
// 削除対象: POST /api/llm/langchain
// 代替: POST /api/llm/chat

const response = await fetch('/api/llm/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    provider: 'grok-4-1-fast-reasoning',
    temperature: 0.7,
  }),
});

const data = await response.json();
// { content: "...", usage: {...}, provider: "...", requestId: "..." }
```

### ストリーミングチャット
```typescript
// 削除対象: POST /api/llm/langchain/stream
// 代替: POST /api/llm/stream

const response = await fetch('/api/llm/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    provider: 'grok-4-1-fast-reasoning',
  }),
});

// SSEストリームを読み取り
const reader = response.body?.getReader();
// ... ストリーム処理
```

---

## 履歴・背景

### なぜ重複が生じたか

1. **初期実装**: `/api/llm/langchain` が最初に実装された
2. **標準化**: `/api/llm/chat` が標準APIとして新規作成された
3. **移行**: フロントエンドが `/api/llm/chat` に移行したが、旧エンドポイントが残った
4. **リエクスポート**: `/api/llm/langchain/stream` がリエクスポートとして作成された

### コメントに記載された意図

```typescript
// app/api/llm/langchain/route.ts のコメント
/**
 * LangChain版 LLM API Route
 * 
 * POST /api/llm/langchain
 * LangChainを使用したチャット完了エンドポイント
 * 
 * 既存の /api/llm/chat と並行して動作  ← 並行運用を意図していた
 */
```

```typescript
// app/api/llm/langchain/stream/route.ts のコメント
/**
 * LangChain版 ストリーミング API Route
 *
 * POST /api/llm/langchain/stream
 * /api/llm/stream への単純なリエクスポート（完全重複の解消）
 *  ← リエクスポートであることを認識していた
 */
```

---

## まとめ

| 対象 | 対応 | 理由 |
|------|------|------|
| `app/api/llm/langchain/route.ts` | **削除** | `/api/llm/chat` と完全重複 |
| `app/api/llm/langchain/stream/route.ts` | **削除** | `/api/llm/stream` へのリエクスポートのみ |
| `app/api/llm/langchain/` ディレクトリ | **削除** | 空ディレクトリとなる |

**影響**: なし（フロントエンドから呼び出されていない）

**代替API**:
- `POST /api/llm/chat` → 非同期チャット
- `POST /api/llm/stream` → ストリーミングチャット

---

*最終更新: 2026-02-22*
