# xAI Agent Tools 実装計画書（最終版）

> **作成日**: 2026-02-24 14:10
> **レビュー日**: 2026-02-24
> **ステータス**: 要確認事項あり（実装前に解決が必要）
> **方針**: 全機能共通ツール、選択肢多め、機能性最優先

---

## コードベースレビュー結果

> **レビュー日**: 2026-02-24
> 既存コードベース（`lib/llm/`, `lib/chat/`, `app/api/llm/stream/route.ts` 等）と照合した結果。

### 問題点（実装前に解決が必要）

#### 1. SSEイベント形式の不整合 ⚠️ 優先度: 高

現在の `app/api/llm/stream/route.ts` が出力するSSEイベント形式:
```json
{"accepted": true}
{"stepStart": {"step": 1, "id": "...", "type": "thinking", "status": "running"}}
{"toolCallEvent": {"id": "...", "type": "web_search", "status": "running"}}
{"content": "..."}
{"stepUpdate": {"id": "...", "status": "completed"}}
{"done": true, "usage": {...}}
```

計画の `XAIClient.stream()` が出力する形式:
```json
{"content": "..."}
{"toolCall": {...}}    ← toolCallEvent ではなく toolCall
{"usage": {...}}
{"done": true}
```

フロントエンドが `toolCallEvent` / `stepStart` / `stepUpdate` を期待している場合、表示が壊れる。
**→ フロントエンドのSSEイベント受信コード（`components/` 配下）を確認の上、出力形式を合わせること。**

---

#### 2. LangChain バイパス方針と修正ファイルリストの矛盾 ⚠️ 優先度: 中

アーキテクチャ図ではxAIはLangChainを**バイパス**して直接Responses APIを叩く設計になっているが、
「実装ファイル - 修正」の一覧に `lib/llm/langchain/chains/streaming.ts` が含まれている。

- xAIはLangChainを使わないのであれば、`langchain/chains/streaming.ts` の修正は不要なはず
- 既存のLangChainパスはGrok以外のプロバイダー（将来追加予定のGemini等）向けに残すのか、xAIも通すのかを明確にすること

**→ どちらのアーキテクチャを採用するか決定してから修正ファイルリストを整理すること。**

---

#### 3. `x_search` のSSEイベント型が未確認 ⚠️ 優先度: 中

ストリームパーサーの以下の実装は推測に基づいている:

```typescript
// X検索（custom_tool_callで返ってくる）
else if (itemType === 'custom_tool_call') {
  const name = item.name as string;
  if (name?.includes('x_')) { ... }
}
```

xAI Responses APIが `x_search` ツール使用時に実際にどのイベント型（`itemType`）を返すかはAPIドキュメントまたは実際のリクエストで確認が取れていない。

**→ xAI APIドキュメントを確認するか、テストリクエストで実際のイベント型を確認してからパーサーを実装すること。**

---

#### 4. `collections_search` ツールの扱いが不明 ⚠️ 優先度: 低

現在の `lib/settings/db.ts` で定義されている `GrokToolType` には以下4つが含まれている:
```typescript
type GrokToolType = 'web_search' | 'x_search' | 'code_execution' | 'collections_search'
```

計画の `XAIToolType` は `web_search` / `x_search` / `code_execution` の3つのみで、`collections_search` が含まれていない。

**→ `collections_search`（ファイル検索）を意図的に削除する場合は、管理画面UI（`app/admin/grok-tools/page.tsx`）の修正範囲にも明示的に含めること。**

---

#### 5. 非ストリーミング `chat()` メソッドがエラーをスロー ⚠️ 優先度: 中

計画の `XAIClient` は以下のように非ストリーミングを未実装:

```typescript
async chat(messages: LLMMessage[]): Promise<LLMResponse> {
  throw new Error('Non-streaming not implemented for xAI');
}
```

既存コードベースでこのメソッドが呼ばれている箇所がある場合、実装後にランタイムエラーになる。

**→ `lib/llm/` 全体でストリーミング以外の `chat()` 呼び出し箇所をgrepして確認すること。**

---

### 問題なし（実装してOK）

| 項目 | 理由 |
|------|------|
| 全ツール常時有効の方針 | `lib/settings/db.ts` が2026-02-20更新で既にその方針に変更済み |
| `lib/llm/xai/` 配下の新規ファイル群 | 既存ファイルと衝突しない |
| `toolOptions` の削除 | `route.ts` の `toolOptions: { enableWebSearch?: boolean }` を削除する方針は整合している |
| ツール表示名・アイコン定義 | 問題なし |

---

### 実装前チェックリスト

- [ ] フロントエンドのSSEイベント受信コードを確認し、出力形式を確定する
- [ ] LangChainをバイパスするか通すかのアーキテクチャを決定し、修正ファイルリストを更新する
- [ ] xAI APIでの `x_search` イベント型を確認する
- [ ] `collections_search` の削除可否を決定し、計画に反映する
- [ ] 非ストリーミング `chat()` の使用箇所をコードベース全体でgrepする

---

## 概要

X検索（Twitter検索）が必須要件。全チャット機能で共通のツールセットを使用し、AIが自律的に必要なツールを選択・組み合わせて使用する。

---

## 採用アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                         Teddy UI                             │
│              （全機能で共通のツールインジケーター）              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              /api/llm/stream (Next.js API)                   │
│                    （全ツール有効で統一）                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ xAI Responses│
                    │ (+ web_search│
                    │  + x_search   │
                    │  + code_exec) │
                    └──────────────┘
```

---

## 共通ツールセット

### 全機能で使用（デフォルト）

| ツール | 用途 |
|--------|------|
| `web_search` | Web検索 - 最新情報、エビデンス収集 |
| `x_search` | X（Twitter）検索 - リアルタイム動向、トレンド |
| `code_execution` | コード実行 - 計算、データ分析、グラフ生成 |

```typescript
// lib/llm/xai/config.ts
export const DEFAULT_XAI_TOOLS: XAIToolType[] = [
  'web_search',
  'x_search', 
  'code_execution',
];

// ツールなしオプション（将来的な拡張用）
export const NO_TOOLS: XAIToolType[] = [];
```

### AIの自律的ツール選択

ユーザーはツールを指定せず、AIがクエリに応じて自動選択：

| ユーザークエリ | AIのツール選択 |
|--------------|---------------|
| "最新のAIニュースを教えて" | `web_search` |
| "この人のXでの反応は？" | `x_search` |
| "このデータの平均を計算して" | `code_execution` |
| "WebとXでこのトピックを調べて" | `web_search` + `x_search` |

---

## 機能別対応

| 機能 | ツール使用 | 備考 |
|------|-----------|------|
| `research-cast` | ✅ 全ツール | 出演者調査にWeb+X+コード |
| `research-info` | ✅ 全ツール | 情報収集にWeb+X |
| `research-evidence` | ✅ 全ツール | ファクトチェックにWeb+X |
| `research-location` | ✅ 全ツール | ロケ地調査にWeb |
| `proposal` | ✅ 全ツール | トレンド調査にWeb+X |
| `general-chat` | ✅ 全ツール | 必要に応じて検索 |
| `minutes` | ✅ 全ツール | 必要に応じてコード実行等 |
| `na-script` | ✅ 全ツール | 必要に応じて検索 |

**方針**: 全機能で共通ツールセット。AIが自律的に使い分ける。

---

## 実装ファイル

### 新規作成

| ファイル | 説明 | 工数 |
|---------|------|------|
| `lib/llm/xai/config.ts` | 共通ツール設定 | 0.5h |
| `lib/llm/xai/types.ts` | xAI固有の型定義 | 0.5h |
| `lib/llm/xai/stream-parser.ts` | xAI SSEストリームパーサー | 2h |
| `lib/llm/xai/client.ts` | xAI Responses APIクライアント | 3h |

### 修正

| ファイル | 変更内容 | 工数 |
|---------|---------|------|
| `lib/llm/factory.ts` | xAIクライアント分岐を追加 | 1h |
| `lib/llm/langchain/chains/streaming.ts` | xAIクライアント統合 | 2h |
| `app/api/llm/stream/route.ts` | 全ツール有効で統一 | 1h |
| `lib/chat/chat-config.ts` | 機能別ツール設定を削除 | 0.5h |
| `lib/chat/agents.ts` | エージェント設定を簡略化 | 0.5h |
| `app/admin/grok-tools/page.tsx` | ツール個別設定UIを削除 | 1h |

### 削除（または非表示）

| ファイル/機能 | 理由 |
|--------------|------|
| `lib/settings/db.ts` の `isToolEnabled` | 全ツール常時有効のため不要 |
| 管理画面のツール個別ON/OFF | 全ツール常時有効のため不要 |
| `toolOptions` パラメータ | フロントエンドからの指定不要 |

**合計工数: 約12時間（2-3日）**

---

## 実装詳細

### 1. 共通設定

```typescript
// lib/llm/xai/config.ts

/** xAI Agent Tools タイプ */
export type XAIToolType = 'web_search' | 'x_search' | 'code_execution';

/** 全機能共通のデフォルトツールセット */
export const DEFAULT_XAI_TOOLS: XAIToolType[] = [
  'web_search',
  'x_search',
  'code_execution',
];

/** ツール表示名 */
export const TOOL_DISPLAY_NAMES: Record<XAIToolType, string> = {
  web_search: 'Web検索',
  x_search: 'X検索',
  code_execution: 'コード実行',
};

/** ツールアイコン（UI用） */
export const TOOL_ICONS: Record<XAIToolType, string> = {
  web_search: '🔍',
  x_search: '🐦',
  code_execution: '💻',
};
```

### 2. 型定義

```typescript
// lib/llm/xai/types.ts

/** xAIツール設定 */
export interface XAIToolConfig {
  type: XAIToolType;
}

/** xAIストリームイベント */
export interface XAIStreamEvent {
  /** コンテンツチャンク */
  content?: string;
  /** ツール呼び出しイベント */
  toolCallEvent?: {
    id: string;
    type: XAIToolType;
    status: 'running' | 'completed' | 'failed';
    name: string;
  };
  /** 使用状況 */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    /** ツール使用回数詳細 */
    toolCalls?: {
      web_search_calls?: number;
      x_search_calls?: number;
      code_interpreter_calls?: number;
    };
  };
  /** 完了フラグ */
  done?: boolean;
  /** エラー */
  error?: string;
}

/** xAIストリームオプション */
export interface XAIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** ツール設定（デフォルト: DEFAULT_XAI_TOOLS） */
  tools?: XAIToolType[];
}
```

### 3. クライアント実装

```typescript
// lib/llm/xai/client.ts

import { XAIStreamEvent, XAIStreamOptions, XAIToolType } from './types';
import { DEFAULT_XAI_TOOLS } from './config';
import { LLMMessage } from '@/lib/llm/types';

const XAI_API_BASE = 'https://api.x.ai/v1';

/**
 * xAI Responses APIを使用してストリーミングレスポンスを取得
 * 
 * @param messages - 会話メッセージ
 * @param options - ストリームオプション（tools未指定時は全ツール有効）
 */
export async function* streamXAIResponses(
  messages: LLMMessage[],
  options: XAIStreamOptions = {}
): AsyncIterable<XAIStreamEvent> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not set');
  }

  // ツール設定（デフォルトは全ツール有効）
  const tools = options.tools ?? DEFAULT_XAI_TOOLS;

  const response = await fetch(`${XAI_API_BASE}/responses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `xAI API error: ${response.status}`);
  }

  yield* parseXAIStream(response);
}
```

### 4. ストリームパーサー

```typescript
// lib/llm/xai/stream-parser.ts

import { XAIStreamEvent, XAIToolType } from './types';
import { TOOL_DISPLAY_NAMES } from './config';

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

function* handleXAIEvent(event: Record<string, unknown>): Generator<XAIStreamEvent> {
  // ツール呼び出し開始
  if (event.type === 'response.output_item.added') {
    const item = event.item as Record<string, unknown> | undefined;
    if (!item) return;

    const itemType = item.type as string;
    const itemId = String(item.id || '');

    // Web検索
    if (itemType === 'web_search_call') {
      yield {
        toolCallEvent: {
          id: itemId,
          type: 'web_search',
          status: 'running',
          name: TOOL_DISPLAY_NAMES.web_search,
        },
      };
    }
    
    // X検索（custom_tool_callで返ってくる）
    else if (itemType === 'custom_tool_call') {
      const name = item.name as string;
      if (name?.includes('x_')) {
        yield {
          toolCallEvent: {
            id: itemId,
            type: 'x_search',
            status: 'running',
            name: TOOL_DISPLAY_NAMES.x_search,
          },
        };
      }
    }
    
    // コード実行
    else if (itemType === 'code_interpreter_call') {
      yield {
        toolCallEvent: {
          id: itemId,
          type: 'code_execution',
          status: 'running',
          name: TOOL_DISPLAY_NAMES.code_execution,
        },
      };
    }
  }

  // コンテンツチャンク
  if (event.type === 'response.output_text.delta' && event.delta) {
    yield { content: String(event.delta) };
  }

  // 完了
  if (event.type === 'response.completed') {
    const response = event.response as Record<string, unknown> | undefined;
    const usage = response?.usage as Record<string, unknown> | undefined;
    const toolDetails = usage?.server_side_tool_usage_details as Record<string, number> | undefined;
    
    yield {
      done: true,
      usage: usage ? {
        inputTokens: Number(usage.input_tokens || 0),
        outputTokens: Number(usage.output_tokens || 0),
        cost: Number(usage.cost_in_usd_ticks || 0) / 1e9,
        toolCalls: toolDetails ? {
          web_search_calls: toolDetails.web_search_calls,
          x_search_calls: toolDetails.x_search_calls,
          code_interpreter_calls: toolDetails.code_interpreter_calls,
        } : undefined,
      } : undefined,
    };
  }
}
```

### 5. Factory統合

```typescript
// lib/llm/factory.ts

import { streamXAIResponses, DEFAULT_XAI_TOOLS } from './xai';
import type { XAIToolType } from './xai/types';

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** 
   * xAI Agent Tools
   * - undefined: デフォルト（全ツール有効）
   * - []: ツールなし
   * - ['web_search', ...]: 指定ツールのみ
   */
  tools?: XAIToolType[];
}

export function createLLMClient(
  provider: LLMProvider,
  options?: LLMOptions
): LLMClient {
  // xAIは常に専用クライアント（ツール有無に関わらず）
  if (provider.startsWith('grok-')) {
    return new XAIClient(provider, options);
  }
  
  // その他のプロバイダーはLangChain
  return createLangChainClient(provider, options);
}

/** xAI専用クライアント */
class XAIClient implements LLMClient {
  constructor(
    private provider: LLMProvider,
    private options: LLMOptions
  ) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // 非ストリーミングは未実装
    throw new Error('Non-streaming not implemented for xAI');
  }

  async *stream(messages: LLMMessage[]): AsyncIterable<LLMStreamChunk> {
    const stream = streamXAIResponses(messages, {
      model: this.provider,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
      tools: this.options.tools, // undefinedなら全ツール有効
    });

    for await (const event of stream) {
      if (event.content) {
        yield { content: event.content };
      }
      
      if (event.toolCallEvent) {
        yield {
          toolCall: {
            id: event.toolCallEvent.id,
            type: event.toolCallEvent.type,
            name: event.toolCallEvent.name,
            status: event.toolCallEvent.status,
          },
        };
      }
      
      if (event.usage) {
        yield {
          usage: {
            inputTokens: event.usage.inputTokens,
            outputTokens: event.usage.outputTokens,
            cost: event.usage.cost,
          },
        };
      }
      
      if (event.error) {
        throw new Error(event.error);
      }
    }
  }
}
```

### 6. API Route簡略化

```typescript
// app/api/llm/stream/route.ts

const streamRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
    }),
  ).min(1),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  // toolOptions は削除（全ツール有効で統一）
});

export async function POST(request: NextRequest): Promise<Response> {
  // ...認証処理...

  const { messages, provider, temperature, maxTokens } = validationResult.data;

  // xAIクライアント生成（全ツール有効で統一）
  const client = createLLMClient(provider || DEFAULT_PROVIDER, {
    temperature,
    maxTokens,
    // tools: undefined → デフォルト（全ツール有効）
  });

  // ストリーミング実行
  const streamIterator = executeStreamingWithClient(client, messages);
  const stream = createSSEStream(streamIterator);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### 7. チャット設定の簡略化

```typescript
// lib/chat/chat-config.ts

// ToolOptions インターフェースは残す（将来の拡張用）
export interface ToolOptions {
  enableWebSearch?: boolean;
  enableXSearch?: boolean;
  enableCodeExecution?: boolean;
}

// 機能別設定から toolOptions を削除
export interface ChatFeatureConfig {
  featureId: ChatFeatureId;
  title: string;
  systemPrompt: string;
  placeholder: string;
  inputLabel?: string;
  outputFormat: 'markdown' | 'plaintext';
  icon?: string;
  description?: string;
  promptKey: string;
  // toolOptions を削除（全機能共通）
  promptSuggestions?: PromptSuggestion[];
}

// 各機能の設定例
export const chatFeatureConfigs: Record<ChatFeatureId, ChatFeatureConfig> = {
  'research-cast': {
    featureId: 'research-cast',
    title: '出演者リサーチ',
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_CAST),
    placeholder: '企画内容・テーマを入力してください',
    outputFormat: 'markdown',
    icon: 'Users',
    description: '企画に適した出演者候補を提案',
    promptKey: PROMPT_KEYS.RESEARCH_CAST,
    // toolOptions 削除
    promptSuggestions: [...],
  },
  // ...他の機能も同様
};
```

---

## UI表示

### ツールインジケーター（全機能共通）

```
🧠 思考中...
🔍 Web検索 [実行中...]
🐦 X検索   [完了 ✓]
💻 コード実行 [待機中]

回答本文...
```

### 使用状況サマリー

```
Web検索: 2回 • X検索: 1回 • コード実行: 0回
1,234 入力 / 567 出力 • $0.00567
```

---

## 実装スケジュール

### Day 1: 基盤実装

| 時間 | タスク |
|------|--------|
| 0-1h | `lib/llm/xai/config.ts` 作成 |
| 1-2h | `lib/llm/xai/types.ts` 作成 |
| 2-4h | `lib/llm/xai/stream-parser.ts` 作成 |
| 4-7h | `lib/llm/xai/client.ts` 作成 |
| 7-8h | 単体テスト |

### Day 2: 統合と簡略化

| 時間 | タスク |
|------|--------|
| 0-2h | `lib/llm/factory.ts` 修正 |
| 2-4h | `app/api/llm/stream/route.ts` 修正 |
| 4-6h | `lib/chat/chat-config.ts` 簡略化 |
| 6-8h | 各機能の動作確認 |

### Day 3: UI調整と最終確認

| 時間 | タスク |
|------|--------|
| 0-2h | 管理画面のツール設定UI削除 |
| 2-4h | ツールインジケーター調整 |
| 4-6h | 統合テスト |
| 6-8h | ドキュメント更新 |

---

## テスト項目

### 機能テスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | 全機能でWeb検索 | 実行される |
| 2 | 全機能でX検索 | 実行される |
| 3 | 全機能でコード実行 | 実行される |
| 4 | AIの自律的ツール選択 | クエリに応じて適切なツールが選ばれる |
| 5 | ツール実行中のUI表示 | インジケーターに全ツール表示 |
| 6 | 使用状況サマリー | 各ツールの使用回数が表示 |

### エラーテスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | API Key無効 | エラーメッセージ表示 |
| 2 | レート制限 | 適切なハンドリング |
| 3 | ストリーム中断 | クリーンアップ |

---

## コスト見積もり

### xAI Agent Tools料金

| 項目 | 料金 |
|------|------|
| Grok 4.1 Fast | $0.20/1M input, $0.50/1M output |
| ツール使用 | 最大$5/1000回 |

### 見積もり（全ツール有効時）

| シナリオ | 推定コスト/回 |
|---------|--------------|
| 簡単な質問（ツール未使用） | $0.001 - $0.003 |
| 標準的な調査（1-2ツール） | $0.01 - $0.03 |
| 複雑な調査（全ツール） | $0.03 - $0.08 |

---

## 関連ドキュメント

- [xAI Responses API](https://docs.x.ai/developers/endpoints/responses)
- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- `docs/specs/api-integration/grok-agent-tools.md`
