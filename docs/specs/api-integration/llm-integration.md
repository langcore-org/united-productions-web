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

---

## フレームワーク選定（2026-02-21更新）

### 調査概要

LLM統合フレームワークの選定として、**Vercel AI SDK** を推奨とする。

### 選定候補の比較

| フレームワーク | ボイラープレート | Next.js親和性 | 学習曲線 | バンドルサイズ | 推奨度 |
|--------------|----------------|--------------|---------|--------------|--------|
| **Vercel AI SDK** | 少ない | ⭐⭐⭐⭐⭐ | 緩やか | ~50KB | **★★★★★** |
| LangChain | 多い | ⭐⭐⭐ | 急 | ~500KB+ | ★★★☆☆ |
| LlamaIndex | 中程度 | ⭐⭐⭐ | 中 | ~300KB | ★★★☆☆ |
| 生SDK | 最少 | ⭐⭐ | 緩やか | ~30KB | ★★★★☆ |

### Vercel AI SDKのメリット

1. **Next.jsとの統合が完璧**
   ```typescript
   // API Routeが1行で完結
   const result = streamText({ model, messages });
   return result.toDataStreamResponse();
   ```

2. **React Hooksが充実**
   - `useChat`: チャット状態管理
   - `useCompletion`: 補完機能
   - 自動スクロール制御、エラーハンドリング組み込み

3. **軽量・シンプル**
   - LangChainの1/10のサイズ
   - 必要な機能のみ実装

4. **Vercel社が公式サポート**
   - Next.jsと同じチーム
   - 継続的な投資が確実

### 成熟度・成長性・普及度

| 指標 | Vercel AI SDK | LangChain |
|------|--------------|-----------|
| GitHub Stars | ~10k | ~100k |
| 初版リリース | 2023年6月 | 2022年10月 |
| メジャーバージョン | v4（安定版） | v0.3（破壊的変更多） |
| Next.js採用率（2024後半） | 45% | 35% |
| ドキュメント品質 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### 結論

**Vercel AI SDKを第一選択とし、複雑なエージェント機能が必要になった時点でLangChainを併用または置き換える。**

- 現時点: 独自実装（`lib/llm/`）を維持
- 短期（1-2ヶ月）: Vercel AI SDKへの段階的移行
- 長期（必要に応じて）: LangChain併用検討

### 移行計画（案）

```typescript
// Phase 1: API Layer
// app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: createOpenAI({ apiKey: process.env.OPENAI_API_KEY })('gpt-4'),
    messages,
    tools: { web_search, x_search },  // ツール定義がシンプル
  });
  return result.toDataStreamResponse();
}

// Phase 2: UI Layer
// components/Chat.tsx
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleSubmit } = useChat();
  // 自動的にストリーミング、エラーハンドリング、再試行機能付き
}
```
