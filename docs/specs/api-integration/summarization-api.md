# 要約API（/api/llm/summarize）

> **会話履歴の要約生成エンドポイント**
>
> **最終更新**: 2026-02-25 14:35

---

## 概要

`/api/llm/summarize`は会話履歴を要約するAPIエンドポイントです。ClientMemoryから呼び出され、動的圧縮率と累積要約に対応しています。

### 責任範囲

| 責任 | 説明 |
|------|------|
| **プロンプト構築** | 要約用プロンプトの生成 |
| **累積要約統合** | 既存要約をプロンプトに含める |
| **LLM呼び出し** | Grok APIによる要約生成 |
| **レスポンス返却** | 要約テキストの返却 |

---

## API仕様

### エンドポイント

```
POST /api/llm/summarize
Content-Type: application/json
```

### リクエスト

```typescript
interface SummarizeRequest {
  messages: LLMMessage[];        // 要約対象のメッセージ配列
  provider: LLMProvider;         // "grok-4-1-fast-reasoning" | "grok-4-0709"
  targetTokens?: number;         // 目標トークン数（オプション）
  existingSummary?: string;      // 既存の要約（累積要約用）
}

interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
```

### レスポンス

```typescript
interface SummarizeResponse {
  summary: string;      // 生成された要約
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

### エラーレスポンス

```typescript
interface SummarizeError {
  error: string;
  code: "INVALID_REQUEST" | "LLM_ERROR" | "TIMEOUT";
}
```

---

## リクエスト例

### 基本的な要約

```bash
curl -X POST http://localhost:3000/api/llm/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "こんにちは" },
      { "role": "assistant", "content": "こんにちは！何かお話ししましょう。" }
    ],
    "provider": "grok-4-1-fast-reasoning",
    "targetTokens": 100
  }'
```

### 累積要約（既存要約あり）

```bash
curl -X POST http://localhost:3000/api/llm/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "今日の天気は？" },
      { "role": "assistant", "content": "今日は晴れです。" }
    ],
    "provider": "grok-4-1-fast-reasoning",
    "targetTokens": 200,
    "existingSummary": "ユーザーと挨拶を交わした。"
  }'
```

---

## 実装詳細

### プロンプト構築

```typescript
// app/api/llm/summarize/route.ts
function buildSummaryPrompt(
  messages: LLMMessage[],
  targetChars: number,
  existingSummary?: string
): string {
  const conversation = messages
    .map(m => `${m.role}: ${m.content}`)
    .join("\n");
  
  const existingSummarySection = existingSummary
    ? `\n\n【これまでの要約】\n${existingSummary}`
    : "";
  
  return `
以下の会話を${targetChars}文字以内で要約してください。

【会話】
${conversation}${existingSummarySection}

【新しい要約】（${targetChars}文字以内）
`.trim();
}
```

### ハンドラ実装

```typescript
export async function POST(request: Request) {
  const body: SummarizeRequest = await request.json();
  const { messages, provider, targetTokens, existingSummary } = body;
  
  // バリデーション
  if (!messages || messages.length === 0) {
    return Response.json(
      { error: "messages is required", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }
  
  // 目標文字数を計算（1トークン≈4文字）
  const targetChars = targetTokens 
    ? targetTokens * 4 
    : 1000;
  
  // プロンプト構築
  const prompt = buildSummaryPrompt(messages, targetChars, existingSummary);
  
  // GrokClientで要約生成
  const client = new GrokClient(provider);
  const summary = await client.summarizeWithPrompt(prompt);
  
  return Response.json({ summary });
}
```

### GrokClientメソッド

```typescript
// lib/llm/clients/grok.ts
class GrokClient {
  async summarizeWithPrompt(prompt: string): Promise<string> {
    const response = await this.callResponsesAPI({
      messages: [{ role: "user", content: prompt }],
      // 要約は短い出力で十分
      max_tokens: 2000,
    });
    
    return response.content;
  }
}
```

---

## 累積要約の仕組み

### プロンプト例

**既存要約なしの場合:**
```
以下の会話を400文字以内で要約してください。

【会話】
user: こんにちは
assistant: こんにちは！

【新しい要約】（400文字以内）
```

**既存要約ありの場合:**
```
以下の会話を400文字以内で要約してください。

【会話】
user: 今日の天気は？
assistant: 今日は晴れです。

【これまでの要約】
ユーザーと挨拶を交わした。

【新しい要約】（400文字以内）
```

### 責任分界

| コンポーネント | 責任 |
|-------------|------|
| **ClientMemory** | コンテキスト構築（messages, existingSummary） |
| **要約API** | プロンプト構築とLLM呼び出し |
| **GrokClient** | 低レベルLLM通信 |
| **LLM** | 要約生成 |

---

## エラーハンドリング

| エラー | 原因 | 対応 |
|-------|------|------|
| INVALID_REQUEST | リクエスト形式不正 | 400返却、エラーメッセージ |
| LLM_ERROR | LLM API失敗 | 500返却、リトライ推奨 |
| TIMEOUT | 処理時間超過 | 504返却、短縮要約推奨 |

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app/api/llm/summarize/route.ts` | APIエンドポイント実装 |
| `lib/llm/clients/grok.ts` | GrokClient.summarizeWithPrompt() |
| `lib/llm/memory/client-memory.ts` | 呼び出し元 |

---

## 関連ドキュメント

- [memory-management.md](./memory-management.md) - ClientMemory詳細
- [conversation-context-flow.md](./conversation-context-flow.md) - end-to-endデータフロー
- [system-prompt-generation.md](./system-prompt-generation.md) - システムプロンプト生成

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-02-25 | 初版作成 |
