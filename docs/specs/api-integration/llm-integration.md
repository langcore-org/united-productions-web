# LLM統合仕様

> **複数LLMプロバイダーを統一インターフェースで利用するための仕様**
>
> **最終更新**: 2026-02-21 17:25

## 概要

AI Hubは複数のLLMプロバイダーを統一インターフェースで利用可能。

## 実装ファイル構成

```
src/lib/llm/
├── types.ts              # LLM共通型定義
├── factory.ts            # LLMClient生成ファクトリ
├── cache.ts              # レスポンスキャッシュ（Upstash Redis）
└── clients/
    ├── gemini.ts         # Google Gemini実装（✅ 連携済み）
    ├── grok.ts           # xAI Grok実装（✅ 連携済み）
    ├── openai.ts         # OpenAI実装（📝 将来連携予定）
    ├── anthropic.ts      # Anthropic実装（📝 将来連携予定）
    └── perplexity.ts     # Perplexity実装（📝 将来連携予定）
```

## API Routes

| エンドポイント | 説明 |
|---|---|
| `/api/llm/chat` | 非同期チャットAPI |
| `/api/llm/stream` | ストリーミングチャットAPI |

## 対応モデル一覧

### 現在連携済み

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
| Google | Gemini 2.5 Flash-Lite | $0.075 | $0.30 | 1M | デフォルト（最安値） |
| Google | Gemini 3.0 Flash | $0.50 | $3.00 | 1M | 高品質タスク |
| xAI | Grok 4.1 Fast | $0.20 | $0.50 | 2M | X検索 |
| xAI | Grok 4 | $3.00 | $15.00 | 2M | 最高品質 |

### 将来連携予定

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
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

## レスポンスキャッシュ

同じプロンプト+プロバイダーの組み合わせを24時間キャッシュし、重複リクエストを削減。
Upstash Redis（無料枠: 10,000コマンド/日）を使用。

### キャッシュキー形式
```
aihub:llm:{hash_slice}:{provider}
```

### TTL設定
- デフォルト: 24時間

## 環境変数

```bash
# 連携済み（必須）
GEMINI_API_KEY=         # Google AI Studio無料枠
XAI_API_KEY=            # xAI（$25無料クレジット）

# 将来連携予定（オプション）
# PERPLEXITY_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```
