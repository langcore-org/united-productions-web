# Client-Server LLM Architecture

> **目的**: クライアントサイドで GrokClient を直接インスタンス化する問題を根本解決
> **作成日**: 2026-02-24
> **更新日**: 2026-03-20
> **状態**: ✅ 実装済み（xAI直接呼び出し方式）

---

## 現状の問題

```
[Client] useLLMStream ──▶ new GrokClient() ──▶ ❌ process.env.XAI_API_KEY not found
```

- `useLLMStream` (Client) が `GrokClient` (Server-only) を直接インスタンス化
- 環境変数はサーバーサイドでのみ存在する

---

## 理想の設計

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ useLLMStream    │───▶│ MemoryManager   │───▶│ API Calls   │  │
│  │ - UI状態管理     │    │ - 会話履歴管理   │    │ - fetch()   │  │
│  │ - ストリーム制御 │    │ - 要約判定      │    │             │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/SSE
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (API Routes)                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ /api/llm/stream │    │ /api/llm/summarize              │  │
│  │ - ストリーミング │    │ - 要約処理      │    │ /api/llm/...│  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────────┐                   │
│  │         LLM Service Layer               │                   │
│  │  ┌─────────────┐    ┌────────────────┐  │                   │
│  │  │ GrokClient  │    │ Other Providers│  │                   │
│  │  │ - API通信    │    │ (future)       │  │                   │
│  │  │ - 要約処理   │    │                │  │                   │
│  │  └─────────────┘    └────────────────┘  │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 責務分離

| 層 | 責務 | 禁止事項 |
|---|---|---|
| **Client** | UI状態、ユーザ入力、API呼び出し | 環境変数アクセス、LLM直接通信 |
| **API Routes** | リクエスト処理、認証、レスポンス整形 | ビジネスロジックの複雑化 |
| **LLM Service** | LLM通信、プロンプト構築、要約処理 | HTTPリクエスト処理 |

---

## 実装計画

### Phase 1: APIルート作成

```typescript
// app/api/llm/summarize/route.ts
POST /api/llm/summarize
Body: { messages: LLMMessage[], provider: LLMProvider }
Response: { summary: string, tokenCount: number }
```

### Phase 2: Memory層のリファクタリング

```typescript
// lib/llm/memory/client-memory.ts
class ClientMemory {
  // 純粋なクライアントサイドロジック
  // 要約が必要な時は API を呼び出す
}
```

### Phase 3: フックの整理

```typescript
// hooks/useLLMStream/index.ts
// - GrokClient インポート削除
// - Memory 経由で要約を実行
```

### Phase 4: GrokClient 拡張

```typescript
// lib/llm/clients/grok.ts
class GrokClient {
  async summarize(messages: LLMMessage[]): Promise<string>
  async chat(messages: LLMMessage[]): Promise<Stream>
}
```

---

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `app/api/llm/summarize/route.ts` | 新規作成 |
| `lib/llm/memory/client-memory.ts` | 新規作成（Client用） |
| `lib/llm/memory/threshold-rolling-summary.ts` | Server用に整理 |
| `lib/llm/clients/grok.ts` | `summarize()` メソッド追加 |
| `hooks/useLLMStream/index.ts` | GrokClient依存削除 |
| `lib/llm/index.ts` | エクスポート整理 |

---

## セキュリティ考慮事項

- APIキーは常にServer-sideのみ
- Clientは認証済みユーザーのみAPIアクセス可能
- レート制限の適用

