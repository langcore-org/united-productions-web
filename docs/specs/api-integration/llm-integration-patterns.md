# LLM統合実装パターン

> **LangChainを使用した詳細実装パターン**
>
> **最終更新**: 2026-02-24

---

## アーキテクチャ

### 統一インターフェース

```typescript
// lib/llm/types.ts
export type LLMProvider = 
  | 'grok-4-1-fast-reasoning'
  | 'grok-4-0709';

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
}

export interface LLMStreamChunk {
  content: string;
  thinking?: string;
  toolCall?: ToolCallInfo;
  reasoningStep?: ReasoningStep;
  toolUsage?: {
    web_search_calls?: number;
    x_search_calls?: number;
  };
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  stream(messages: LLMMessage[]): AsyncIterable<LLMStreamChunk>;
}
```

### Factory パターン

```typescript
// lib/llm/factory.ts
export function createLLMClient(provider: LLMProvider): LLMClient {
  switch (provider) {
    case 'grok-4-1-fast-reasoning':
    case 'grok-4-0709':
      return new GrokClient(provider);
    // 将来追加予定
    // case 'gemini-2.5-flash-lite':
    //   return new GeminiClient(provider);
  }
}
```

---

## LangChain実装パターン

### 基本的なChain構築

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { BytesOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const model = new ChatOpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4',
  streaming: true,
});

const parser = new BytesOutputParser();
const chain = RunnableSequence.from([model, parser]);

// レスポンス変換、エラーハンドリング、SSE生成は自前実装が必要
const stream = await chain.stream(messages);
```

### Agent with Tools

```typescript
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({ temperature: 0 });
const tools = [webSearchTool, xSearchTool];

const agent = createReactAgent({
  llm: model,
  tools,
});

const executor = new AgentExecutor({
  agent,
  tools,
});

const result = await executor.invoke({ input: '検索クエリ' });
```

### Memory付きChain

```typescript
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => new ChatMessageHistory(),
  inputMessagesKey: 'input',
  historyMessagesKey: 'history',
});
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
- [langchain-usage-current.md](./langchain-usage-current.md) - LangChain使用状況の詳細
