# xAI (Grok) 直接実装 復元・実装ガイド

> **調査日**: 2026-02-24 15:10  
> **最終更新**: 2026-03-20  
> **状態**: ✅ **完了（アーカイブ済み）**  
> **目的**: LangChain移行前のxAI直接実装を復元し、Agent Tools対応を行う  
> **対象者**: 実装担当AIエージェント

---

## 🎉 完了報告

**2026-03-20: xAI (Grok) 直接実装の復元とAgent Tools対応が完了しました。**

このドキュメントは参考資料としてアーカイブされています。

---

## ⚠️ 重要: 実装前に必ず読むこと

### 現在の状況

| 項目 | 内容 |
|------|------|
| **現在のプロバイダー** | **xAI (Grok) のみ** |
| **実装方式** | **xAI直接API呼び出し**（LangChain不使用） |
| **LangChain** | 将来のGemini追加に備え保持（現在使用せず） |

### なぜxAIだけ直接実装なのか

xAI Agent Tools（`web_search`, `x_search`, `code_execution`）は **`/v1/responses`** エンドポイント専用です。LangChainは `/v1/chat/completions` に接続するため、**Agent Toolsが使用不可**です。

### 実装のゴール

1. **xAI直接実装を復元**（`lib/llm/clients/grok.ts`）
2. **LangChainは保持**（将来のGemini追加用）
3. **Factoryで分岐**（xAIは直接、GeminiはLangChain）

---

## 実装手順（ステップバイステップ）

### Step 0: 事前確認

```bash
# 現在のコードベースを確認
cd /home/koyomaru/agent1
ls -la lib/llm/clients/  # 存在しないはず
ls -la lib/llm/langchain/  # 存在する（保持）
```

### Step 1: ファイル復元

#### 1-1. grok.ts の復元

```bash
# 最終版（b8297cf）から復元
mkdir -p lib/llm/clients
git show b8297cf:lib/llm/clients/grok.ts > lib/llm/clients/grok.ts
```

#### 1-2. factory.ts の復元（GrokClient使用版）

```bash
# 削除前のfactory.tsを復元
git show 70c1823~1:lib/llm/factory.ts > lib/llm/factory.ts
```

### Step 2: 必要な修正

#### 2-1. ツール設定の簡略化

**修正対象**: `lib/llm/clients/grok.ts`

```typescript
// ===== BEFORE（復元直後）=====
export interface GrokToolOptions {
  enableWebSearch?: boolean;
  enableXSearch?: boolean;
  enableCodeExecution?: boolean;
  enableFileSearch?: boolean;
}

// ===== AFTER（修正後）=====
export type GrokToolType = 'web_search' | 'x_search' | 'code_execution';

export const DEFAULT_GROK_TOOLS: GrokToolType[] = [
  'web_search',
  'x_search', 
  'code_execution',
];

export interface GrokToolOptions {
  tools?: GrokToolType[];  // undefinedならDEFAULT_GROK_TOOLSを使用
}
```

#### 2-2. GROK_TOOLS定義の修正

```typescript
// ===== BEFORE =====
export const GROK_TOOLS = {
  web_search: {
    type: 'web_search' as const,
    description: 'Search the web for current information',
  },
  x_search: {
    type: 'x_search' as const,
    description: 'Search X (Twitter) for real-time information',
  },
  code_execution: {
    type: 'code_execution' as const,
    description: 'Execute Python code in a secure sandbox',
  },
  collections_search: {  // ← 削除
    type: 'collections_search' as const,
    description: 'Search uploaded documents and files',
  },
} as const;

// ===== AFTER =====
export const GROK_TOOLS = {
  web_search: {
    type: 'web_search' as const,
    description: 'Search the web for current information',
  },
  x_search: {
    type: 'x_search' as const,
    description: 'Search X (Twitter) for real-time information',
  },
  code_execution: {
    type: 'code_execution' as const,
    description: 'Execute Python code in a secure sandbox',
  },
} as const;

export const TOOL_DISPLAY_NAMES: Record<GrokToolType, string> = {
  web_search: 'Web検索',
  x_search: 'X検索',
  code_execution: 'コード実行',
};
```

#### 2-3. getTools() メソッドの修正

```typescript
// ===== BEFORE =====
private getTools(): Array<{ type: string }> | undefined {
  const tools: Array<{ type: string }> = [];
  
  if (this.toolOptions.enableWebSearch) {
    tools.push({ type: 'web_search' });
  }
  
  if (this.toolOptions.enableXSearch) {
    tools.push({ type: 'x_search' });
  }
  
  if (this.toolOptions.enableCodeExecution) {
    tools.push({ type: 'code_execution' });
  }
  
  // collections_search は vector_store_ids が必要なため現状未対応
  
  return tools.length > 0 ? tools : undefined;
}

// ===== AFTER =====
private getTools(): Array<{ type: string }> {
  const tools = this.toolOptions.tools ?? DEFAULT_GROK_TOOLS;
  return tools.map(t => ({ type: t }));
}
```

#### 2-4. constructor の修正

```typescript
// ===== BEFORE =====
constructor(provider: LLMProvider, toolOptions?: GrokToolOptions) {
  this.provider = provider;
  this.model = this.getModelName(provider);
  this.toolOptions = {
    enableWebSearch: true,
    enableXSearch: true,
    enableCodeExecution: true,
    enableFileSearch: false,
    ...toolOptions,
  };
  // ...
}

// ===== AFTER =====
constructor(provider: LLMProvider, toolOptions?: GrokToolOptions) {
  this.provider = provider;
  this.model = this.getModelName(provider);
  // ツール設定：未指定時は全ツール有効
  this.toolOptions = {
    tools: toolOptions?.tools ?? DEFAULT_GROK_TOOLS,
  };
  // ...
}
```

### Step 3: SSEイベント形式の更新

**修正対象**: `lib/llm/clients/grok.ts` の `streamWithUsage()` メソッド

#### 3-1. 新しいイベント型の定義

```typescript
// ファイル先頭に追加
export type XAIStreamEventType =
  | { type: 'start' }
  | { type: 'tool_call'; id: string; name: GrokToolType; displayName: string; status: 'running' | 'completed' | 'failed' }
  | { type: 'content'; delta: string }
  | { type: 'done'; usage: { inputTokens: number; outputTokens: number; cost: number; toolCalls?: Partial<Record<GrokToolType, number>> } }
  | { type: 'error'; message: string };
```

#### 3-2. streamWithUsage の戻り値を変更

```typescript
// ===== BEFORE =====
async *streamWithUsage(messages: LLMMessage[]): AsyncIterable<{
  chunk?: string;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
  toolCall?: { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed' };
  toolUsage?: { ... };
  reasoning?: { step: number; content: string; tokens?: number };
  thinking?: string;
}>

// ===== AFTER =====
async *streamWithUsage(messages: LLMMessage[]): AsyncIterable<XAIStreamEventType>
```

#### 3-3. イベント生成部分の修正

```typescript
// ===== BEFORE（旧形式）=====
// ツール呼び出し開始
if (event.type === 'response.output_item.added' && event.item) {
  const item = event.item;
  if (item.type === 'web_search_call') {
    yield { 
      toolCall: { 
        id: item.id, 
        type: 'web_search', 
        status: 'running'
      } 
    };
  }
  // ...
}

// ===== AFTER（新形式）=====
// 開始イベント
yield { type: 'start' };

// ツール呼び出し開始
if (event.type === 'response.output_item.added' && event.item) {
  const item = event.item;
  if (item.type === 'web_search_call') {
    yield { 
      type: 'tool_call',
      id: item.id,
      name: 'web_search',
      displayName: TOOL_DISPLAY_NAMES.web_search,
      status: 'running'
    };
  } else if (item.type === 'custom_tool_call') {
    const name = item.name as string;
    if (name?.includes('x_')) {
      yield { 
        type: 'tool_call',
        id: item.id,
        name: 'x_search',
        displayName: TOOL_DISPLAY_NAMES.x_search,
        status: 'running'
      };
    }
  } else if (item.type === 'code_interpreter_call') {
    yield { 
      type: 'tool_call',
      id: item.id,
      name: 'code_execution',
      displayName: TOOL_DISPLAY_NAMES.code_execution,
      status: 'running'
    };
  }
}

// ツール呼び出し完了（response.output_item.done）
if (event.type === 'response.output_item.done' && event.item) {
  // ... 同様に status: 'completed' でyield
}

// コンテンツチャンク
if (event.type === 'response.output_text.delta' && event.delta) {
  yield { type: 'content', delta: event.delta };
}

// 完了
if (event.type === 'response.completed') {
  const usage = event.response?.usage;
  yield { 
    type: 'done', 
    usage: {
      inputTokens: usage?.input_tokens || 0,
      outputTokens: usage?.output_tokens || 0,
      cost: this.calcCost(usage),
      toolCalls: usage?.server_side_tool_usage_details ? {
        web_search: usage.server_side_tool_usage_details.web_search_calls,
        x_search: usage.server_side_tool_usage_details.x_search_calls,
        code_execution: usage.server_side_tool_usage_details.code_interpreter_calls,
      } : undefined
    }
  };
}
```

### Step 4: Factoryの修正

**修正対象**: `lib/llm/factory.ts`

```typescript
/**
 * LLM Factory
 * 
 * 複数のLLMプロバイダーを統一インターフェースで生成するFactoryパターン
 * - xAI (Grok): 直接実装（Agent Tools対応のため）
 * - その他: LangChain経由（将来の拡張用）
 */

import { LLMProvider, LLMClient, VALID_PROVIDERS } from './types';
import { getProviderInfo } from './config';
import { GrokClient, type GrokToolOptions } from './clients/grok';
// import { createLangChainClient } from './langchain/adapter'; // 将来使用

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** xAI Agent Tools設定（undefinedなら全ツール有効） */
  tools?: GrokToolOptions['tools'];
}

/**
 * LLMクライアントを生成するFactory関数
 * 
 * @param provider - 使用するLLMプロバイダー
 * @param options - LLMオプション
 * @returns LLMClientインターフェースを実装したクライアントインスタンス
 */
export function createLLMClient(
  provider: LLMProvider,
  options?: LLMOptions
): LLMClient {
  // xAIは直接実装（Agent Tools対応のため）
  if (provider.startsWith('grok-')) {
    return new GrokClient(provider, { tools: options?.tools });
  }
  
  // 将来: Gemini追加時はLangChain経由
  // if (provider.startsWith('gemini-')) {
  //   return createLangChainClient(provider, options);
  // }
  
  throw new Error(`Provider "${provider}" is not supported. Currently only xAI (Grok) is available.`);
}

// ... 他の関数（isValidProvider, getProviderDisplayName等）は維持
```

### Step 5: API Routeの修正

**修正対象**: `app/api/llm/stream/route.ts`

```typescript
/**
 * LLM Stream API Route (xAI直接実装版)
 *
 * POST /api/llm/stream
 * Server-Sent Events形式でストリーミングレスポンスを返すエンドポイント
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import { createLLMClient, isValidProvider } from "@/lib/llm/factory";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("XAIStreamAPI");

const streamRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1),
    }),
  ).min(1),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  // toolOptionsは削除（全ツール有効で統一）
});

export type StreamRequest = z.infer<typeof streamRequestSchema>;

/**
 * SSEストリームを作成
 */
function createSSEStream(
  iterator: AsyncIterable<{ type: string; [key: string]: unknown }>
): ReadableStream {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of iterator) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorData = `data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`[${requestId}] Stream request started`);

    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();
    
    // バリデーション
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
          requestId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages, provider: requestedProvider, temperature, maxTokens } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return new Response(
          JSON.stringify({ error: "Invalid provider", requestId }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider`, { provider });

    // xAIクライアント生成（全ツール有効で統一）
    const client = createLLMClient(provider, {
      temperature,
      maxTokens,
      // tools: undefined → デフォルト（全ツール有効）
    });

    // ストリーミング実行
    const streamIterator = client.streamWithUsage(messages as LLMMessage[]);
    const stream = createSSEStream(streamIterator);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error(`[${requestId}] Error`, { error: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage, requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
```

### Step 6: 型定義の更新

**修正対象**: `lib/llm/types.ts`

```typescript
// LLMClientインターフェースにstreamWithUsageを追加
export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  stream(messages: LLMMessage[]): AsyncIterable<string>;
  // 追加: 詳細なストリーミング（ツールイベント含む）
  streamWithUsage?(messages: LLMMessage[]): AsyncIterable<{
    type: string;
    [key: string]: unknown;
  }>;
}
```

### Step 7: ビルド確認

```bash
# 型チェック
npx tsc --noEmit

# ビルド
npm run build
```

---

## ファイル構成（実装後）

```
lib/llm/
├── types.ts              # LLM共通型定義
├── factory.ts            # LLMClient生成ファクトリ（xAI/Gemini分岐）
├── cache.ts              # レスポンスキャッシュ
├── config.ts             # プロバイダー設定
├── utils.ts              # ユーティリティ関数
├── index.ts              # 公開APIエクスポート
├── clients/              # 直接実装（xAI等）
│   └── grok.ts           # xAI直接実装 ⭐ 新規復元・修正
└── langchain/            # LangChain統合（将来のGemini用に保持）
    ├── types.ts
    ├── factory.ts
    ├── adapter.ts
    └── ...
```

---

## 変更ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `lib/llm/clients/grok.ts` | 復元＋修正 | xAI直接実装 |
| `lib/llm/factory.ts` | 修正 | GrokClient使用に変更 |
| `lib/llm/types.ts` | 修正 | streamWithUsage追加 |
| `lib/llm/index.ts` | 修正 | エクスポート整理 |
| `app/api/llm/stream/route.ts` | 修正 | xAI直接呼び出しに変更 |
| `lib/llm/langchain/` | 保持 | 削除しない（将来のGemini用） |

---

## テスト項目

### 機能テスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | Web検索実行 | `type: 'tool_call'` イベントが生成される |
| 2 | X検索実行 | `type: 'tool_call'` イベントが生成される |
| 3 | コード実行 | `type: 'tool_call'` イベントが生成される |
| 4 | ストリーミング応答 | `type: 'content'` イベントが連続して生成される |
| 5 | 完了時 | `type: 'done'` イベントにusage情報が含まれる |
| 6 | ツール使用回数 | `usage.toolCalls` に各ツールの使用回数が含まれる |

### エラーテスト

| # | テスト項目 | 期待結果 |
|---|-----------|---------|
| 1 | API Key無効 | `type: 'error'` イベントが生成される |
| 2 | 不正なリクエスト | HTTP 400エラー |

---

## 実装時の注意事項

### 1. LangChainは削除しない

```bash
# ❌ やってはいけない
rm -rf lib/llm/langchain/
npm uninstall langchain @langchain/core ...

# ✅ 正しい対応
# lib/llm/langchain/ は保持する
# package.json からも削除しない
```

### 2. SSEイベント形式

新しい形式を厳密に守る：

```typescript
// ✅ 正しい
data: {"type": "tool_call", "id": "...", "name": "web_search", "displayName": "Web検索", "status": "running"}

// ❌ 間違い（旧形式）
data: {"toolCallEvent": {"type": "web_search", ...}}
```

### 3. ツール設定

全ツール常時有効：

```typescript
// ✅ 正しい
const tools = options?.tools ?? DEFAULT_GROK_TOOLS;  // 未指定時は全ツール

// ❌ 間違い（個別ON/OFF）
if (options?.enableWebSearch) tools.push('web_search');
```

---

## トラブルシューティング

### 問題1: 型エラーが発生する

**原因**: `lib/llm/types.ts` の `LLMClient` インターフェースに `streamWithUsage` がない

**対応**: `types.ts` に追加

```typescript
export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  stream(messages: LLMMessage[]): AsyncIterable<string>;
  streamWithUsage?(messages: LLMMessage[]): AsyncIterable<{ type: string; [key: string]: unknown }>;
}
```

### 問題2: x_searchが動作しない

**原因**: x_searchは `custom_tool_call` タイプで返ってくる

**対応**: `name` フィールドを確認

```typescript
if (item.type === 'custom_tool_call') {
  const name = item.name as string;
  if (name?.includes('x_')) {
    // x_searchとして処理
  }
}
```

### 問題3: ビルドが失敗する

**原因**: `lib/llm/index.ts` のエクスポートが古いまま

**対応**: `index.ts` を修正

```typescript
// lib/llm/index.ts
export type { LLMClient, LLMProvider, LLMMessage, LLMResponse } from './types';
export { createLLMClient } from './factory';
export { isValidProvider, getProviderDisplayName } from './factory';
export { VALID_PROVIDERS } from './types';

// Grok固有のエクスポート
export type { GrokToolType, GrokToolOptions } from './clients/grok';
export { DEFAULT_GROK_TOOLS, TOOL_DISPLAY_NAMES } from './clients/grok';
```

---

## 参考資料

### コミット履歴

```bash
# 各コミットのgrok.tsを確認
git show b8297cf:lib/llm/clients/grok.ts    # 最終版（推奨）
git show 70c1823~1:lib/llm/factory.ts       # 削除前のfactory
```

### 関連ドキュメント

- `docs/plans/xai-agent-tools-final.md` - 最新実装計画
- `docs/specs/api-integration/llm-integration-overview.md` - LLM統合仕様
- `docs/specs/api-integration/streaming-events.md` - SSEイベント仕様

---

## 実装完了チェックリスト

- [ ] `lib/llm/clients/grok.ts` を復元・修正
- [ ] `lib/llm/factory.ts` を修正
- [ ] `lib/llm/types.ts` を修正
- [ ] `lib/llm/index.ts` を修正
- [ ] `app/api/llm/stream/route.ts` を修正
- [ ] 型チェックが通る (`npx tsc --noEmit`)
- [ ] ビルドが成功する (`npm run build`)
- [ ] Web検索が動作する
- [ ] X検索が動作する
- [ ] コード実行が動作する
- [ ] SSEイベント形式が新形式になっている

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針
- [LLM統合仕様](../../docs/specs/api-integration/llm-integration-overview.md) - LLM統合の詳細

---

**最終更新**: 2026-03-20 14:35

---

## 履歴

- **2026-02-24 15:10** - 初版作成
- **2026-02-24 15:20** - 実装手順を詳細化
- **2026-03-20** - 技術スタック情報更新（Supabase認証反映）
