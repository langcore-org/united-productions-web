# xAI Agent Tools 実装計画書

> **作成日**: 2026-02-24 13:50
> **ステータス**: 計画中

---

## 概要

現在のLangChain実装ではxAI Agent Tools（Web Search, X Search, Code Execution）が統合されていない。この計画書では、xAI Responses APIを直接使用してツール機能を実装する方法を定義する。

---

## 実装アプローチ

**採用**: 生のHTTPリクエスト（アプローチ1）

理由:
- xAIの全機能を直接使用可能
- 実装がシンプルで制御しやすい
- 既存のSSEパーサー構造を流用できる

---

## 変更ファイル一覧

### 新規作成

| ファイル | 説明 |
|---------|------|
| `lib/llm/xai/client.ts` | xAI Responses APIクライアント |
| `lib/llm/xai/types.ts` | xAI固有の型定義 |
| `lib/llm/xai/stream-parser.ts` | xAI SSEストリームパーサー |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/factory.ts` | ツール有効時にxAIクライアントを使用する分岐を追加 |
| `lib/llm/langchain/chains/streaming.ts` | xAIクライアントとの統合 |
| `app/api/llm/stream/route.ts` | `toolOptions`を実際に使用するように修正 |
| `lib/settings/db.ts` | `isToolEnabled`を実装（DB設定を参照） |

---

## 実装詳細

### 1. xAIクライアントの実装

```typescript
// lib/llm/xai/types.ts
export type XAIToolType = 'web_search' | 'x_search' | 'code_execution';

export interface XAIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: XAIToolType[];
}

export interface XAIStreamEvent {
  content?: string;
  toolCallEvent?: {
    id: string;
    type: string;
    status: 'running' | 'completed' | 'failed';
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  done?: boolean;
  error?: string;
}
```

```typescript
// lib/llm/xai/client.ts
export async function* streamXAIWithTools(
  messages: LLMMessage[],
  tools: XAIToolType[],
  options: XAIStreamOptions = {}
): AsyncIterable<XAIStreamEvent> {
  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'grok-4-1-fast-reasoning',
      input: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      tools: tools.map(t => ({ type: t })),
      stream: true,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  yield* parseXAIStream(response);
}
```

### 2. ストリームパーサーの実装

```typescript
// lib/llm/xai/stream-parser.ts
export async function* parseXAIStream(
  response: Response
): AsyncGenerator<XAIStreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const event = JSON.parse(data);
          yield* handleXAIEvent(event);
        } catch {
          // JSONパースエラーは無視
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* handleXAIEvent(event: unknown): Generator<XAIStreamEvent> {
  if (typeof event !== 'object' || event === null) return;

  const e = event as Record<string, unknown>;

  // ツール呼び出し開始
  if (e.type === 'response.output_item.added' && e.item) {
    const item = e.item as Record<string, unknown>;
    
    if (item.type === 'web_search_call') {
      yield {
        toolCallEvent: {
          id: String(item.id || ''),
          type: 'web_search',
          status: 'running',
        },
      };
    } else if (item.type === 'custom_tool_call' && item.name === 'x_keyword_search') {
      yield {
        toolCallEvent: {
          id: String(item.id || ''),
          type: 'x_search',
          status: 'running',
        },
      };
    } else if (item.type === 'code_interpreter_call') {
      yield {
        toolCallEvent: {
          id: String(item.id || ''),
          type: 'code_execution',
          status: 'running',
        },
      };
    }
  }

  // コンテンツチャンク
  if (e.type === 'response.output_text.delta' && e.delta) {
    yield { content: String(e.delta) };
  }

  // 完了
  if (e.type === 'response.completed' && e.response) {
    const response = e.response as Record<string, unknown>;
    const usage = response.usage as Record<string, unknown> | undefined;
    
    yield {
      done: true,
      usage: usage ? {
        inputTokens: Number(usage.input_tokens || 0),
        outputTokens: Number(usage.output_tokens || 0),
        cost: Number(usage.cost_in_usd_ticks || 0) / 1e9,
      } : undefined,
    };
  }
}
```

### 3. Factoryの修正

```typescript
// lib/llm/factory.ts
import { streamXAIWithTools, type XAIToolType } from './xai/client';

export function createLLMClient(
  provider: LLMProvider,
  options?: LangChainOptions & { tools?: XAIToolType[] }
): LLMClient {
  // xAIでツールが有効な場合は専用クライアント
  if (provider.startsWith('grok-') && options?.tools && options.tools.length > 0) {
    return new XAIToolsClient(provider, options);
  }
  
  // 通常はLangChain
  return createLangChainClient(provider, options);
}

// xAIツール対応クライアント
class XAIToolsClient implements LLMClient {
  constructor(
    private provider: LLMProvider,
    private options: LangChainOptions & { tools?: XAIToolType[] }
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // 非ストリーミング実装（必要に応じて）
    throw new Error('Non-streaming not implemented for xAI tools');
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const stream = streamXAIWithTools(
      messages,
      this.options.tools || [],
      {
        model: this.provider,
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
      }
    );

    for await (const event of stream) {
      if (event.content) {
        yield event.content;
      }
      if (event.error) {
        throw new Error(event.error);
      }
    }
  }
}
```

### 4. API Routeの修正

```typescript
// app/api/llm/stream/route.ts
export async function POST(request: NextRequest): Promise<Response> {
  // ...認証処理...

  const {
    messages,
    provider,
    temperature,
    maxTokens,
    toolOptions,  // ← これを実際に使用
  } = validationResult.data;

  // ツール設定を変換
  const tools: XAIToolType[] = [];
  if (toolOptions?.enableWebSearch) tools.push('web_search');
  if (toolOptions?.enableXSearch) tools.push('x_search');
  if (toolOptions?.enableCodeExecution) tools.push('code_execution');

  // クライアント生成（ツール有効時はxAI専用クライアント）
  const client = createLLMClient(provider, {
    temperature,
    maxTokens,
    tools: tools.length > 0 ? tools : undefined,
  });

  // ストリーミング実行
  const stream = createSSEStreamFromClient(client, messages);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## 実装ステップ

### Phase 1: 基盤実装（1-2日）

1. `lib/llm/xai/types.ts` の作成
2. `lib/llm/xai/stream-parser.ts` の作成
3. `lib/llm/xai/client.ts` の作成（基本実装）

### Phase 2: 統合（1日）

4. `lib/llm/factory.ts` の修正（分岐ロジック追加）
5. `app/api/llm/stream/route.ts` の修正（`toolOptions`を使用）

### Phase 3: テスト（1日）

6. 各ツール（web_search, x_search, code_execution）の動作確認
7. ストリーミングイベントの確認
8. エラーハンドリングの確認

### Phase 4: 設定有効化（オプション）

9. `lib/settings/db.ts` の `isToolEnabled` を実装
10. 管理画面での設定変更を反映

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| xAI APIの仕様変更 | 高 | レスポンス型を厳密に定義し、不明なフィールドは無視する |
| レート制限 | 中 | 既存のレート制限処理を流用 |
| エラーレスポンスの違い | 中 | xAI固有のエラーハンドリングを実装 |
| ストリーム中断 | 低 | AbortController対応を確実に実装 |

---

## 今後の拡張

### ツールパラメータのサポート

```typescript
// 将来的にツールパラメータをサポート
const tools = [
  {
    type: 'web_search',
    allowed_domains: ['github.com', 'stackoverflow.com'],
  },
  {
    type: 'x_search',
    from_date: '2025-02-01',
    to_date: '2025-02-20',
  },
];
```

### 複数プロバイダー対応

将来的にOpenAI、Anthropic等でも同様のツール機能を実装する場合は、各プロバイダー専用のクライアントを作成し、Factoryで統一的に扱う。

---

## 参考資料

- [xAI Responses API Documentation](https://docs.x.ai/developers/endpoints/responses)
- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- 既存実装: `lib/llm/langchain/chains/streaming.ts`
- 既存実装: `lib/llm/sse-parser.ts`
