# Client-Server LLM Architecture

> **設計ドキュメント**  
> **作成日**: 2026-02-24  
> **更新日**: 2026-02-24

---

## 概要

本ドキュメントは、AI Hub アプリケーションにおける LLM（Large Language Model）統合の Client-Server アーキテクチャ設計を定義します。

### 設計の目的

1. **セキュリティ**: API キー等の機密情報をサーバーサイドに限定
2. **責務分離**: Client = UI/UX、Server = LLM 通信・ビジネスロジック
3. **保守性**: 明確な層の分離によるコードの可読性・テスト容易性向上

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │ useLLMStream    │───▶│ ClientMemory    │───▶│ API Calls   │  │
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

---

## 層の責務

### Client Layer (Browser)

| 責務 | 詳細 |
|------|------|
| UI 状態管理 | メッセージ表示、入力制御、ローディング状態 |
| ユーザ入力処理 | チャット入力、ファイルアップロード、ボタン操作 |
| API 呼び出し | Server API への HTTP リクエスト |
| メモリ管理 | ClientMemory による会話履歴の管理 |

**禁止事項**:
- 環境変数へのアクセス
- LLM API への直接通信
- 機密情報の保持

### API Routes Layer (Next.js API Routes)

| 責務 | 詳細 |
|------|------|
| リクエスト処理 | HTTP リクエストの受付・バリデーション |
| 認証・認可 | セッション確認、アクセス制御 |
| レスポンス整形 | JSON/SSE 形式でのレスポンス返却 |

**禁止事項**:
- 複雑なビジネスロジックの実装
- 直接の LLM API 呼び出し（Service Layer 経由）

### LLM Service Layer

| 責務 | 詳細 |
|------|------|
| LLM 通信 | xAI API 等への通信実装 |
| プロンプト構築 | システムプロンプト、要約プロンプトの生成 |
| 要約処理 | 会話履歴の要約生成 |
| エラー処理 | LLM 特有のエラーハンドリング |

**禁止事項**:
- HTTP リクエスト/レスポンスの直接処理
- 認証ロジック

---

## 主要コンポーネント

### 1. ClientMemory

**ファイル**: `lib/llm/memory/client-memory.ts`

クライアントサイドで動作する会話履歴管理クラス。要約が必要な場合は `/api/llm/summarize` API を呼び出す。

```typescript
class ClientMemory {
  constructor(provider: LLMProvider, options?: ClientMemoryOptions)
  
  async addMessage(message: LLMMessage): Promise<void>
  async addMessages(messages: LLMMessage[]): Promise<void>
  getContext(): MemoryContext  // API送信用メッセージを返す
  clear(): void
}
```

### 2. GrokClient

**ファイル**: `lib/llm/clients/grok.ts`

サーバーサイド専用の xAI API クライアント。

```typescript
class GrokClient {
  constructor(provider: LLMProvider)
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse>
  async *streamWithUsage(messages: LLMMessage[]): AsyncGenerator<SSEEvent>
  async summarize(messages: LLMMessage[]): Promise<string>  // 要約生成
}
```

### 3. API Routes

#### POST /api/llm/summarize

会話履歴の要約を生成。

**Request**:
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "provider": "grok-4-1-fast-reasoning"
}
```

**Response**:
```json
{
  "summary": "会話の要約テキスト"
}
```

#### POST /api/llm/stream

LLM ストリーミングレスポンスを返却（SSE）。

### 4. useLLMStream Hook

**ファイル**: `hooks/useLLMStream/index.ts`

LLM ストリーミングを管理する React Hook。

```typescript
function useLLMStream(options?: UseLLMStreamOptions): {
  content: string
  isComplete: boolean
  error: string | null
  toolCalls: ToolCallInfo[]
  startStream: (messages: LLMMessage[], provider: LLMProvider) => Promise<void>
  cancelStream: () => void
}
```

---

## データフロー

### 通常のチャットフロー

```
1. ユーザー入力
   ↓
2. useLLMStream.startStream() 呼び出し
   ↓
3. ClientMemory にメッセージ追加
   ↓
4. ClientMemory.getContext() でコンテキスト取得
   ↓
5. POST /api/llm/stream (SSE)
   ↓
6. GrokClient.streamWithUsage()
   ↓
7. ストリームレスポンスを UI に反映
```

### 要約が必要な場合のフロー

```
1. ClientMemory.addMessage() で閾値超過を検知
   ↓
2. POST /api/llm/summarize
   ↓
3. GrokClient.summarize() で要約生成
   ↓
4. 要約を ClientMemory に保存
   ↓
5. 以降の getContext() で要約 + 直近メッセージを返す
```

---

## セキュリティ考慮事項

### API キー管理

- `XAI_API_KEY` はサーバーサイド環境変数のみで定義
- Client コードに API キーが含まれないことを確認
- Vercel の環境変数設定で Production/Preview/Development を分離

### 認証

- すべての LLM API は認証必須（`requireAuth`）
- 未認証アクセスは 401 を返却

### レート制限

- 将来的に Upstash Redis 等でレート制限を検討

---

## エラーハンドリング

| 層 | エラー種別 | 処理 |
|---|---|---|
| Client | API 通信エラー | UI にエラーメッセージ表示、リトライボタン |
| Client | 要約 API 失敗 | 古い要約を保持し続行（機能劣化） |
| API Routes | 認証エラー | 401 レスポンス |
| API Routes | バリデーションエラー | 400 レスポンス |
| Service | LLM API エラー | 500 レスポンス、ログ出力 |

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `lib/llm/clients/grok.ts` | GrokClient 実装 |
| `lib/llm/memory/client-memory.ts` | ClientMemory 実装 |
| `lib/llm/memory/threshold-rolling-summary.ts` | Server-side Memory（旧） |
| `hooks/useLLMStream/index.ts` | ストリーミング Hook |
| `app/api/llm/summarize/route.ts` | 要約 API |
| `app/api/llm/stream/route.ts` | ストリーミング API |
| `lib/llm/index.ts` | 公開 API |

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-02-24 | 初版作成。Client-Server 分離アーキテクチャを確立 |

---

## 参照

- [LLM Integration Overview](./api-integration/llm-integration-overview.md)
- [Error Handling](./error-handling.md)
