# 複数LLM統合設計書

## 概要
AI Hubは複数のLLMプロバイダーを統一インターフェースで利用可能。
初期はGoogle AI Studio無料枠（Gemini）を使用し、必要に応じて他LLMを追加。

## 実装状況

| プロバイダー | モデル | 実装状況 | 動作確認 |
|---|---|---|---|
| Google | Gemini 2.5 Flash-Lite | ✅ 実装済み | ✅ 動作確認済み |
| Google | Gemini 3.0 Flash | ✅ 実装済み | ✅ 動作確認済み |
| xAI | Grok 4.1 Fast | ✅ 実装済み | ✅ 動作確認済み |
| xAI | Grok 4 | ✅ 実装済み | ⏳ 未確認（APIキー必要） |
| OpenAI | GPT-4o-mini | ✅ 実装済み | ⏳ 未確認（APIキー必要） |
| OpenAI | GPT-5 | ✅ 実装済み | ⏳ 未確認（APIキー必要） |
| Anthropic | Claude 4.5 Sonnet | ✅ 実装済み | ⏳ 未確認（APIキー必要） |
| Anthropic | Claude Opus 4.6 | ✅ 実装済み | ⏳ 未確認（APIキー必要） |
| Perplexity | Sonar | ✅ 実装済み | ✅ 動作確認済み |
| Perplexity | Sonar Pro | ✅ 実装済み | ⏳ 未確認（APIキー必要） |

**最終更新**: 2026年2月16日

## 実装ファイル構成

```
src/lib/llm/
├── types.ts              # LLM共通型定義
├── factory.ts            # LLMClient生成ファクトリ
├── cache.ts              # レスポンスキャッシュ（Upstash Redis）
└── clients/
    ├── gemini.ts         # Google Gemini実装
    ├── grok.ts           # xAI Grok実装
    ├── openai.ts         # OpenAI実装
    ├── anthropic.ts      # Anthropic実装
    └── perplexity.ts     # Perplexity実装
```

## API Routes実装状況

| エンドポイント | 実装状況 | 説明 |
|---|---|---|
| `/api/llm/chat` | ✅ 実装済み | 非同期チャットAPI |
| `/api/llm/stream` | ✅ 実装済み | ストリーミングチャットAPI |

## 使用量モニタリング実装状況

| 機能 | 実装状況 | 説明 |
|---|---|---|
| UsageLogモデル（Prisma） | ✅ 実装済み | 使用量ログのDB記録 |
| トークン数記録機能 | ✅ 実装済み | 入出力トークン数の記録 |
| コスト計算機能 | ✅ 実装済み | 各モデルのコスト計算 |
| キャッシュ機能 | ✅ 実装済み | Upstash Redisによるレスポンスキャッシュ |
| エクスポート機能 | ✅ 実装済み | Markdown/CSVエクスポート対応 |
| 月次レポート生成 | ⏳ 未実装 | 将来実装予定 |

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

### 概要
同じプロンプト+プロバイダーの組み合わせを24時間キャッシュし、重複リクエストを削減。
Upstash Redis（無料枠: 10,000コマンド/日）を使用。

### 実装ファイル
- `lib/llm/cache.ts` - キャッシュ機能の実装

### 主要機能

| 関数 | 説明 |
|---|---|
| `generateCacheKey` | メッセージ配列とプロバイダーからハッシュキーを生成 |
| `cacheLLMResponse` | LLMレスポンスをキャッシュに保存 |
| `getCachedLLMResponse` | キャッシュからレスポンスを取得 |
| `invalidateLLMCache` | 特定のキャッシュを無効化 |
| `clearLLMCache` | プロバイダー別または全キャッシュをクリア |
| `getCacheStats` | キャッシュ統計情報を取得 |

### キャッシュキー形式
```
aihub:llm:{hash_slice}:{provider}
```

### TTL設定
- デフォルト: 24時間（`CACHE_TTL.LLM_RESPONSE = 86400`）

### 使用例
```typescript
import { cacheLLMResponse, getCachedLLMResponse } from '@/lib/llm/cache';

// キャッシュを確認
const cached = await getCachedLLMResponse(messages, provider);
if (cached) {
  return cached;
}

// LLMリクエスト実行
const response = await client.chat(messages);

// レスポンスをキャッシュ
await cacheLLMResponse(messages, provider, response);
```

## エクスポート機能

### 概要
LLMの会話データや処理結果をMarkdown/CSV形式でエクスポート。

### 実装ファイル
- `lib/export/index.ts` - エクスポート機能の実装

### 対応フォーマット

| フォーマット | 拡張子 | 用途 |
|---|---|---|
| Markdown | `.md` | 会話ログ、ドキュメント出力 |
| CSV | `.csv` | データ分析、表形式データ |

### 主要機能

| 関数 | 説明 |
|---|---|
| `exportData` | 指定フォーマットでデータをエクスポート |
| `exportToMarkdown` | Markdown形式でエクスポート |
| `exportToCSV` | CSV形式でエクスポート |
| `convertConversationToMarkdown` | 会話データをMarkdownに変換 |
| `convertConversationToCSV` | 会話データをCSVに変換 |

### 使用例
```typescript
import { exportData, convertConversationToMarkdown } from '@/lib/export';

// 会話データをMarkdownに変換してエクスポート
const markdown = convertConversationToMarkdown(messages, '会話タイトル');
exportData({
  format: 'markdown',
  data: markdown,
  filename: 'conversation.md'
});

// CSVエクスポート
exportData({
  format: 'csv',
  data: JSON.stringify(dataArray),
  filename: 'data.csv'
});
```

### 特徴
- CSV出力時にBOMを付加し、Excelでの文字化けを防止
- JSON配列を自動的にCSV形式に変換
- タブ区切りデータのCSV変換に対応
- ファイル名に日時を自動付加（デフォルト）

## 環境変数
```bash
GEMINI_API_KEY=         # 必須（Google AI Studio無料枠）
XAI_API_KEY=            # PJ-C用（$25無料クレジット）
PERPLEXITY_API_KEY=     # PJ-C用
OPENAI_API_KEY=         # オプション
ANTHROPIC_API_KEY=      # オプション
```
