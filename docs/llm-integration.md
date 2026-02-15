# 複数LLM統合設計書

## 概要
AI Hubは複数のLLMプロバイダーを統一インターフェースで利用可能。
初期はGoogle AI Studio無料枠（Gemini）を使用し、必要に応じて他LLMを追加。

## 対応モデル一覧（2026年2月時点）

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
| Google | Gemini 2.5 Flash-Lite | $0.075 | $0.30 | 1M | デフォルト（無料枠） |
| Google | Gemini 3.0 Flash | $0.50 | $3.00 | 1M | 高品質タスク（無料枠） |
| xAI | Grok 4.1 Fast | $0.20 | $0.50 | 2M | X検索（PJ-C） |
| xAI | Grok 4 | $3.00 | $15.00 | 2M | 最高品質 |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 | 128K | コスパ |
| OpenAI | GPT-5 | $1.25 | $10.00 | 400K | フラッグシップ |
| Anthropic | Claude 4.5 Sonnet | $3.00 | $15.00 | 200K | バランス |
| Anthropic | Claude Opus 4.6 | $5.00 | $25.00 | 200K+ | 最高品質 |
| Perplexity | Sonar | $1.00 | - | - | エビデンス検索 |

## Google AI Studio 無料枠
- Gemini 2.5 Flash-Lite: 30 RPM / 1,500 RPD
- Gemini 3.0 Flash: 30 RPM / 1,500 RPD
- 初期運用はこの無料枠で十分。超えたら従量課金。

## アーキテクチャ

### 統一インターフェース
```typescript
// src/lib/llm/types.ts
export type LLMProvider =
  | 'gemini-2.5-flash-lite'
  | 'gemini-3.0-flash'
  | 'grok-4.1-fast'
  | 'grok-4'
  | 'gpt-4o-mini'
  | 'gpt-5'
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.6'
  | 'perplexity-sonar'
  | 'perplexity-sonar-pro';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  thinking?: string;
  usage?: { inputTokens: number; outputTokens: number; cost: number; };
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  stream(messages: LLMMessage[]): AsyncIterable<string>;
}
```

### Factory パターン
```typescript
// src/lib/llm/factory.ts
export function createLLMClient(provider: LLMProvider): LLMClient {
  switch (provider) {
    case 'gemini-2.5-flash-lite':
    case 'gemini-3.0-flash':
      return new GeminiClient(provider);
    case 'grok-4.1-fast':
    case 'grok-4':
      return new GrokClient(provider);
    case 'gpt-4o-mini':
    case 'gpt-5':
      return new OpenAIClient(provider);
    case 'claude-sonnet-4.5':
    case 'claude-opus-4.6':
      return new AnthropicClient(provider);
    case 'perplexity-sonar':
    case 'perplexity-sonar-pro':
      return new PerplexityClient(provider);
  }
}
```

### API Route
```typescript
// src/app/api/llm/chat/route.ts
export async function POST(req: NextRequest) {
  const { messages, provider = 'gemini-2.5-flash-lite' } = await req.json();
  const client = createLLMClient(provider);
  const response = await client.chat(messages);
  // UsageLogに記録
  return Response.json(response);
}
```

### ストリーミング
```typescript
// src/app/api/llm/stream/route.ts
export async function POST(req: NextRequest) {
  const { messages, provider = 'gemini-2.5-flash-lite' } = await req.json();
  const client = createLLMClient(provider);
  const stream = client.stream(messages);

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    })
  );
}
```

## PJ別デフォルトLLM設定

| PJ | デフォルトLLM | 理由 |
|---|---|---|
| PJ-A（議事録） | gemini-2.5-flash-lite | 無料枠、テキスト整形に十分 |
| PJ-B（書き起こし） | gemini-2.5-flash-lite | 無料枠、テキスト整形に十分 |
| PJ-C（人探し） | grok-4.1-fast | X Search対応が必須 |
| PJ-C（エビデンス） | perplexity-sonar | ソース付き回答 |
| PJ-D（ロケスケ） | gemini-2.5-flash-lite | 無料枠、テキスト整形に十分 |

## レスポンスキャッシュ
```typescript
// src/lib/llm/cache.ts
// Upstash Redis（無料枠: 10,000コマンド/日）でキャッシュ
// 同じプロンプト+プロバイダーの組み合わせを24時間キャッシュ
```

## 使用量モニタリング
- UsageLogモデルに全リクエストを記録
- provider, inputTokens, outputTokens, cost を記録
- 月次レポート生成機能（将来実装）

## 環境変数
```bash
GEMINI_API_KEY=         # 必須（Google AI Studio無料枠）
XAI_API_KEY=            # PJ-C用（$25無料クレジット）
PERPLEXITY_API_KEY=     # PJ-C用
OPENAI_API_KEY=         # オプション
ANTHROPIC_API_KEY=      # オプション
```
