# LLM統合実装パターン

> **xAI直接呼び出しとLangChainの詳細実装パターン**
>
> **最終更新**: 2026-03-20 14:35

---

## アーキテクチャ

### 統一インターフェース

```typescript
// lib/llm/types.ts
export type LLMProvider = 
  | 'grok-4-1-fast-reasoning'
  | 'grok-4.20-multi-agent-beta-latest';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  thinking?: string;
  usage?: { 
    inputTokens: number; 
    outputTokens: number; 
    cost: number; 
  };
  citations?: Citation[];
  toolCalls?: ToolCallInfo[];
}

export interface LLMStreamChunk {
  content?: string;
  thinking?: string;
  toolCall?: ToolCallInfo;
  citation?: Citation;
  reasoningStep?: ReasoningStep;
  toolUsage?: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
  };
}

export interface LLMClient {
  chat(messages: LLMMessage[], options?: ChatOptions): Promise<LLMResponse>;
  stream(messages: LLMMessage[], options?: StreamOptions): AsyncIterable<LLMStreamChunk>;
  summarizeWithPrompt(prompt: string): Promise<string>;
}
```

### Factory パターン

```typescript
// lib/llm/factory.ts
export function createLLMClient(provider: LLMProvider): LLMClient {
  switch (provider) {
    case 'grok-4-1-fast-reasoning':
    case 'grok-4.20-multi-agent-beta-latest':
      return new GrokClient(provider);
    
    default: {
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unknown or unsupported provider: ${_exhaustiveCheck}`);
    }
  }
}
```

### xAI直接呼び出し実装パターン

```typescript
// lib/llm/clients/grok.ts（抜粋）
export class GrokClient implements LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  
  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.apiKey = process.env.XAI_API_KEY!;
  }
  
  async *stream(
    messages: LLMMessage[], 
    options?: StreamOptions
  ): AsyncIterable<LLMStreamChunk> {
    const tools = options?.tools ?? DEFAULT_GROK_TOOLS;
    
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.provider,
        input: messages,
        stream: true,
        tools: tools.map(t => ({ type: t })),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      }),
    });
    
    if (!response.ok) {
      throw new LLMError(`xAI API error: ${response.status}`);
    }
    
    // SSEパースと変換
    for await (const event of this.parseSSE(response.body!)) {
      yield* this.transformEventToChunks(event);
    }
  }
  
  private async *parseSSE(body: ReadableStream): AsyncIterable<XAIStreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          yield JSON.parse(data);
        }
      }
    }
  }
}
```

---

## xAI直接呼び出しパターン

### SSEイベント処理

```typescript
// ストリーミングイベントの型定義
interface XAIStreamEvent {
  type: string;
  sequence_number?: number;
  delta?: string;
  content_index?: number;
  item_id?: string;
  output_index?: number;
  response?: XAIResponse;
  item?: XAIOutputItem;
  annotation?: URLCitation;
}

// 主要イベントタイプ
const EVENT_TYPES = {
  // レスポンス開始/終了
  RESPONSE_CREATED: 'response.created',
  RESPONSE_IN_PROGRESS: 'response.in_progress',
  RESPONSE_COMPLETED: 'response.completed',
  
  // 出力アイテム
  OUTPUT_ITEM_ADDED: 'response.output_item.added',
  OUTPUT_ITEM_DONE: 'response.output_item.done',
  
  // Web検索
  WEB_SEARCH_CALL_IN_PROGRESS: 'response.web_search_call.in_progress',
  WEB_SEARCH_CALL_SEARCHING: 'response.web_search_call.searching',
  WEB_SEARCH_CALL_COMPLETED: 'response.web_search_call.completed',
  
  // X検索
  CUSTOM_TOOL_CALL_INPUT_DELTA: 'response.custom_tool_call_input.delta',
  CUSTOM_TOOL_CALL_INPUT_DONE: 'response.custom_tool_call_input.done',
  
  // テキスト生成
  CONTENT_PART_ADDED: 'response.content_part.added',
  OUTPUT_TEXT_DELTA: 'response.output_text.delta',
  OUTPUT_TEXT_DONE: 'response.output_text.done',
  OUTPUT_TEXT_ANNOTATION_ADDED: 'response.output_text.annotation.added',
} as const;
```

### Tool Calling実装

```typescript
// ツール呼び出し情報の追跡
interface ToolCallInfo {
  id: string;
  name: string;
  query?: string;
  status: 'in_progress' | 'completed' | 'failed';
  citations?: Citation[];
}

// イベントからツール情報を抽出
private extractToolCallFromEvent(event: XAIStreamEvent): ToolCallInfo | null {
  if (event.type === 'response.output_item.added' && event.item) {
    const { item } = event;
    
    // Web検索
    if (item.type === 'web_search_call') {
      return {
        id: item.id,
        name: 'web_search',
        status: 'in_progress',
      };
    }
    
    // X検索
    if (item.type === 'custom_tool_call' && 
        item.name?.startsWith('x_')) {
      return {
        id: item.call_id || item.id,
        name: 'x_search',
        status: 'in_progress',
      };
    }
  }
  
  // 検索クエリの抽出
  if (event.type === 'response.custom_tool_call_input.done') {
    const input = JSON.parse(event.input || '{}');
    return {
      id: event.item_id,
      name: 'x_search',
      query: input.query,
      status: 'in_progress',
    };
  }
  
  return null;
}
```

### Citations処理

```typescript
// URL引用情報
interface URLCitation {
  type: 'url_citation';
  url: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

// Citationsの重複除去と収集
class CitationCollector {
  private seenUrls = new Set<string>();
  private citations: Citation[] = [];
  
  add(annotation: URLCitation): Citation | null {
    if (!annotation.url) return null;
    
    // URLで重複判定
    if (this.seenUrls.has(annotation.url)) {
      return null;
    }
    this.seenUrls.add(annotation.url);
    
    const citation: Citation = {
      url: annotation.url,
      title: annotation.title || '',
      type: this.getCitationType(annotation.url),
    };
    
    this.citations.push(citation);
    return citation;
  }
  
  private getCitationType(url: string): 'web' | 'x' {
    return (url.includes('x.com') || url.includes('twitter.com')) 
      ? 'x' 
      : 'web';
  }
  
  getAll(): Citation[] {
    return [...this.citations];
  }
}
```

---

## LangChain実装パターン（将来用）

> **注**: 以下のパターンは将来のGemini追加に備えて保持しています。
> 現在は使用していません。

### 基本的なChain構築

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BytesOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const model = new ChatGoogleGenerativeAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  modelName: 'gemini-2.5-flash-lite',
  streaming: true,
});

const parser = new BytesOutputParser();
const chain = RunnableSequence.from([model, parser]);

const stream = await chain.stream(messages);
```

---

## レスポンスキャッシュ

同じプロンプト+プロバイダーの組み合わせを24時間キャッシュし、重複リクエストを削減。
Upstash Redis（無料枠: 10,000コマンド/日）を使用。

### キャッシュキー形式
```
aihub:llm:{hash_slice}:{provider}
```

### TTL設定
- デフォルト: 24時間

---

## 無料枠・クレジット情報

### xAI
- $25無料クレジット（新規登録時）
- クレジットカード登録で追加クレジット購入可能

### Google AI Studio（将来連携予定）
- Gemini 2.5 Flash-Lite: 30 RPM / 1,500 RPD
- Gemini 3.0 Flash: 30 RPM / 1,500 RPD

---

## 関連ドキュメント

- [llm-integration-overview.md](./llm-integration-overview.md) - 概要・基本情報
- [xai-responses-api-spec.md](./xai-responses-api-spec.md) - xAI Responses API詳細仕様
- [xai-citations-behavior-spec.md](./xai-citations-behavior-spec.md) - Citations動作仕様
- [memory-management.md](./memory-management.md) - ClientMemory詳細

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-20 | xAI直接呼び出しパターンを追加、LangChainパターンを「将来用」に移動 |
| 2026-02-24 | 初版作成（LangChainパターン） |
