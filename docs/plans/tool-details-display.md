# ツール詳細表示機能 実装計画

> **作成日**: 2026-02-26  
> **Phase 1 完了日**: 2026-02-26  
> **優先度**: Medium → High（リアルタイム体験向上のため）  
> **関連**: ストリーミング表示改善、UX向上

---

## 目標: リアルタイムで何が起きているかを可視化

現在、ユーザーはツール使用中「Web検索を実行中」のような簡易表示しか見られない。以下の情報を**リアルタイム**で表示することで、AIがどの情報源に基づいて回答を生成しているかを理解できるようにする。

### 理想的なユーザー体験

```
[T+0.0s] ユーザー: "OpenAI GPT-5について最新情報を検索して"

[T+0.5s] 🤖 AI: 考え中...

[T+1.2s] 🔍 Web検索 開始
         └─ 検索クエリを決定中...

[T+1.8s] 🔍 Web検索 実行中
         └─ クエリ: "OpenAI GPT-5 最新情報 リリース日"

[T+2.5s] 🐦 X検索 実行中
         └─ クエリ: "GPT-5 from:OpenAI"

[T+3.2s] 🔍 Web検索 完了 ✓
         └─ クエリ: "OpenAI GPT-5 最新情報 リリース日"
         └─ 18件のソースを確認

[T+4.1s] 🤖 AI: 回答生成中...
         └─ OpenAIのGPT-5は、2025年8月7日に正式リリースされました...
         └─ [1] [2] [3] ...（引用をリアルタイム表示）
```

---

## Phase 1 調査結果（完了）

### xAI API レスポンス構造の分析

**詳細な調査結果は specs ドキュメントを参照**:
- [xAI Responses API 仕様](../specs/api-integration/xai-responses-api-spec.md)
- 調査スクリプト: `scripts/investigate-tool-response.ts`

#### 🔍 主要な発見

| 項目 | 発見内容 | 実装への影響 |
|------|---------|-------------|
| **Web検索結果** | `sources` フィールドは**常に空** | `action.query` で検索クエリのみ取得可能 |
| **検索結果の実体** | `message.content.annotations` に `url_citation` として含まれる | AI回答内の引用リンクとして取得可能 |
| **X検索** | `custom_tool_call` として処理される | `input` でクエリ取得可能、**結果は非公開** |
| **ツール結果フィールド** | `result` フィールドは**存在しない** | 独自の方法で情報を収集する必要あり |

#### 📡 イベントフローと取得可能な情報

```
1. response.output_item.added (web_search_call)
   └─ item.action.query: "" (初期値は空)
   
   【UI表示】"Web検索 開始"

2. response.output_item.done (web_search_call)
   └─ item.action.query: "実際の検索クエリ" ✅
   └─ item.action.sources: [] (常に空) ❌
   
   【UI表示】"Web検索: {クエリ}"

3. response.output_item.done (x_search custom_tool_call)
   └─ item.input: "{\"query\":\"...\"}" ✅
   
   【UI表示】"X検索: {クエリ}"

4. response.output_item.done (message)
   └─ item.content[0].annotations: [
        { type: "url_citation", url: "...", title: "..." } ✅
      ]
   
   【UI表示】"参照ソース: {N件}"
```

---

## 実装方針: 段階的アプローチ

### 方針 1: 最小限実装（MVP）- 推奨

まずはシンプルに、**クエリ表示のみ**を実装。これだけで十分な価値がある。

**変更ファイル**:
1. `lib/llm/clients/grok.ts` - クエリを抽出して `tool_call` イベントに含める
2. `components/chat/messages/ToolCallMessage.tsx` - クエリを表示

**メリット**:
- 変更が最小限（2ファイルのみ）
- リスクが低い
- 即座にユーザー価値を提供

### 方針 2: 完全実装（フル機能）

引用URLもリアルタイム表示。MVP後に実装。

**追加変更**:
1. `hooks/useLLMStream/index.ts` - annotations を収集
2. `components/chat/messages/WebSearchDetails.tsx` - 新規作成
3. 引用URLの折りたたみ表示

---

## 実装タスク詳細

### Phase 2: 最小限実装（MVP）- 1日

#### タスク 2.1: GrokClient の修正

**対象**: `lib/llm/clients/grok.ts`

**変更内容**:
```typescript
// response.output_item.done で web_search_call のクエリを取得
if (event.type === "response.output_item.done" && event.item) {
  const toolEvent = this.parseToolCallEvent(event.item, "completed");
  if (toolEvent) {
    // web_search_call の場合、action.query を input として追加
    if (event.item.type === "web_search_call" && event.item.action?.query) {
      return {
        ...toolEvent,
        input: event.item.action.query,
      };
    }
    
    // custom_tool_call (x_search) の場合、input をパース
    if (event.item.type === "custom_tool_call" && event.item.input) {
      try {
        const inputData = JSON.parse(event.item.input);
        return {
          ...toolEvent,
          input: inputData.query || event.item.input,
        };
      } catch {
        return toolEvent;
      }
    }
    
    return toolEvent;
  }
}
```

#### タスク 2.2: ToolCallMessage の拡張

**対象**: `components/chat/messages/ToolCallMessage.tsx`

**変更内容**:
```typescript
// クエリ表示を追加
<div className="flex items-center gap-2">
  {status === "running" ? (
    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
  ) : (
    <CheckCircle2 className="w-4 h-4 text-green-600" />
  )}
  <span className="font-medium">{config.label}</span>
  
  {/* クエリ表示を追加 */}
  {toolCall.input && (
    <span className="text-blue-700/70 text-xs truncate max-w-[300px] font-mono bg-blue-100/50 px-1.5 py-0.5 rounded">
      {toolCall.input}
    </span>
  )}
</div>
```

### Phase 3: 完全実装（フル機能）- 2-3日

#### タスク 3.1: 型定義の追加

**対象**: `lib/llm/tools/types.ts`（新規作成）

```typescript
export interface WebSearchCitation {
  url: string;
  title: string;
}

export interface ToolCallResult {
  query: string;
  citations?: WebSearchCitation[];
}
```

**対象**: `hooks/useLLMStream/types.ts`

```typescript
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;
  result?: ToolCallResult;  // ← 追加
}
```

#### タスク 3.2: useLLMStream の拡張

**対象**: `hooks/useLLMStream/index.ts`

```typescript
// citations を収集して state に保存
const [citations, setCitations] = useState<WebSearchCitation[]>([]);

// message イベントで annotations を収集
if (event.type === "message") {
  const newCitations = event.content
    ?.flatMap(c => c.annotations || [])
    .filter(a => a.type === "url_citation")
    .map(a => ({ url: a.url, title: a.title })) || [];
  
  setCitations(prev => [...prev, ...newCitations]);
}

// done 時に citations を toolCalls に紐付け
if (event.type === "done") {
  setToolCalls(prev => prev.map(tool => {
    if (tool.name === "web_search") {
      return {
        ...tool,
        result: {
          query: tool.input || "",
          citations: citations,
        }
      };
    }
    return tool;
  }));
}
```

#### タスク 3.3: WebSearchDetails コンポーネント

**対象**: `components/chat/messages/WebSearchDetails.tsx`（新規）

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface WebSearchDetailsProps {
  query: string;
  citations: Array<{ url: string; title: string }>;
}

export function WebSearchDetails({ query, citations }: WebSearchDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (citations.length === 0) {
    return (
      <div className="mt-2 text-xs text-blue-600/70">
        検索クエリ: <span className="font-mono">{query}</span>
      </div>
    );
  }
  
  return (
    <div className="mt-2">
      {/* 検索クエリ */}
      <div className="text-xs text-blue-700/80 mb-1.5">
        <span className="font-medium">検索:</span>
        <code className="ml-1.5 bg-blue-100/70 px-1.5 py-0.5 rounded text-blue-800">
          {query}
        </code>
      </div>
      
      {/* 引用ソース */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>参照ソース ({citations.length}件)</span>
      </button>
      
      {isExpanded && (
        <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto pr-1">
          {citations.map((citation, i) => (
            <a
              key={i}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 p-1.5 rounded bg-white/60 hover:bg-white/80 transition-colors group"
            >
              <span className="text-xs text-blue-500 font-medium shrink-0">[{i + 1}]</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-blue-700 truncate group-hover:underline">
                  {citation.title}
                </div>
                <div className="text-[10px] text-blue-400/80 truncate">
                  {new URL(citation.url).hostname}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## UI状態遷移

### Web検索の表示タイムライン

```
[実行中]
┌─────────────────────────────┐
│ 🔍 Web検索                   │
│    └─ 検索クエリ: "GPT-5..." │ ← クエリ確定後に表示
└─────────────────────────────┘

[完了]
┌─────────────────────────────┐
│ ✓ Web検索                    │
│    ├─ 検索クエリ: "GPT-5..." │
│    └─ 参照ソース (18件) ▼    │ ← クリックで展開
└─────────────────────────────┘

[展開時]
┌─────────────────────────────┐
│ ✓ Web検索                    │
│    ├─ 検索クエリ: "GPT-5..." │
│    ├─ 参照ソース (18件) ▲    │
│    │  [1] openai.com/...    │
│    │  [2] cbsnews.com/...   │
│    │  [3] cnbc.com/...      │
│    │  ...                    │
└─────────────────────────────┘
```

---

## エッジケースと対応

| ケース | 対応 |
|-------|------|
| クエリが取得できない | `input` が空の場合は非表示（既存動作） |
| 引用URLが多すぎる | 初期表示3件、残りは「他N件」をクリックで展開 |
| X検索結果が非公開 | 「検索結果はプライバシー保護のため表示されません」と表示 |
| 同一クエリの重複 | 重複排除してユニークなURLのみ表示 |
| URLが無効 | 無効なURLはホスト名表示を省略 |

---

## 段階的リリース計画

### Step 1: MVP（クエリ表示のみ）
**目標**: 1日
- GrokClient でクエリを抽出
- ToolCallMessage でクエリを表示

**成功基準**:
- [ ] Web検索でクエリが表示される
- [ ] X検索でクエリが表示される
- [ ] 既存機能に影響がない

### Step 2: フル機能（引用URL表示）
**目標**: 2-3日
- useLLMStream で citations を収集
- WebSearchDetails コンポーネント作成

**成功基準**:
- [ ] 引用URLがリアルタイム表示される
- [ ] 折りたたみ/展開が動作する
- [ ] 外部リンクが正常に開く

### Step 3: 改善
**目標**: 継続的
- パフォーマンス最適化
- デザイン調整
- モバイル対応

---

## 変更ファイル一覧

### Phase 2（MVP）
| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| `lib/llm/clients/grok.ts` | parseToolCallEvent で input を追加 | +15行 |
| `components/chat/messages/ToolCallMessage.tsx` | クエリ表示を追加 | +10行 |

### Phase 3（フル機能）
| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| `lib/llm/tools/types.ts` | 新規: ツール結果型定義 | +20行 |
| `hooks/useLLMStream/types.ts` | ToolCallInfo に result 追加 | +5行 |
| `hooks/useLLMStream/index.ts` | citations 収集ロジック追加 | +30行 |
| `components/chat/messages/ToolCallMessage.tsx` | WebSearchDetails 統合 | +10行 |
| `components/chat/messages/WebSearchDetails.tsx` | 新規: 詳細表示コンポーネント | +80行 |

---

## 技術設計詳細

### システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Client (Browser)                                                            │
│  ┌─────────────────────┐     ┌─────────────────────┐                       │
│  │ FeatureChat         │────→│ useLLMStream        │                       │
│  │ (UI表示)            │←────│ (状態管理)          │                       │
│  └─────────────────────┘     └──────────┬──────────┘                       │
│                                         │                                   │
│  ┌──────────────────────────────────────┼─────────────────────┐            │
│  │ components/chat/messages             │                     │            │
│  │  ┌─────────────────┐  ┌──────────────┴──────────┐         │            │
│  │  │ ToolCallMessage │←─│ ToolCallInfo[]          │         │            │
│  │  │ - input (query) │  │ - id, name, status      │         │            │
│  │  │ - result        │  │ - result.citations[]    │         │            │
│  │  └─────────────────┘  └─────────────────────────┘         │            │
│  └───────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ SSE
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ Server (Next.js)                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/llm/stream                                                │   │
│  │  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐ │   │
│  │  │ GrokClient      │────→│ xAI API         │────→│ SSE Stream    │ │   │
│  │  │                 │     │                 │     │               │ │   │
│  │  │ 1. リクエスト    │     │ 1. ツール実行    │     │ 1. 生イベント  │ │   │
│  │  │ 2. イベント変換  │←────│ 2. ストリーム    │     │ 2. パース      │ │   │
│  │  │ 3. SSE送信      │     │                 │     │               │ │   │
│  │  └─────────────────┘     └─────────────────┘     └───────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### データフロー（シーケンス図）

```
User    FeatureChat    useLLMStream    GrokClient    xAI API
 │           │              │              │            │
 │──prompt──→│              │              │            │
 │           │──startStream→│              │            │
 │           │              │──request────→│───────────→│
 │           │              │              │            │
 │           │              │←──tool_start─┤←───────────│
 │           │←─addToolCall─│              │            │
 │           │              │              │            │
 │           │              │←──tool_input─┤←───────────│
 │           │←─updateInput─│              │            │
 │           │              │              │            │
 │           │              │←──citations──┤←───────────│
 │           │←─updateCitations─────────────│            │
 │           │              │              │            │
 │           │              │←──content────┤←───────────│
 │           │←─updateContent───────────────│            │
 │           │              │              │            │
 │           │              │←──done───────┤            │
 │           │←─finalizeToolCalls───────────│            │
 │           │              │              │            │
 │←─display result──────────│              │            │
 │           │              │              │            │
```

### 型定義詳細

#### 1. ツール結果型（新規: lib/llm/tools/types.ts）

```typescript
/**
 * @fileoverview ツール実行結果の型定義
 * xAI APIは直接的なツール結果を返さないため、
 * message.annotations から情報を抽出する
 */

/** URL引用情報 */
export interface WebSearchCitation {
  /** 引用元URL */
  url: string;
  /** 表示タイトル（通常は数字"1", "2"など） */
  title: string;
  /** テキスト内の開始位置 */
  startIndex?: number;
  /** テキスト内の終了位置 */
  endIndex?: number;
}

/** Web検索結果 */
export interface WebSearchResult {
  type: "web_search";
  query: string;
  citations: WebSearchCitation[];
}

/** X検索結果 */
export interface XSearchResult {
  type: "x_search";
  query: string;
  // X検索の結果はAPIレスポンスに含まれない
}

/** コード実行結果 */
export interface CodeExecutionResult {
  type: "code_execution";
  code?: string;
  output?: string;
  error?: string;
}

/** ツール実行結果のUnion型 */
export type ToolResult = WebSearchResult | XSearchResult | CodeExecutionResult;

/** ツール呼び出し情報（結果付き） */
export interface ToolCallWithResult {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed" | "failed";
  input?: string;
  result?: ToolResult;
  startedAt: Date;
  completedAt?: Date;
}
```

#### 2. SSEEvent 拡張（lib/llm/types.ts）

```typescript
export type SSEEvent =
  | { type: "start" }
  | { 
      type: "tool_call"; 
      id: string; 
      name: GrokToolType;
      displayName: string;
      status: "running" | "completed";
      input?: string;  // ← 検索クエリ
    }
  | { type: "content"; delta: string }
  | { 
      type: "done"; 
      usage: {
        inputTokens: number;
        outputTokens: number;
        cost: number;
        toolCalls: Record<string, number>;
        /** Web検索の引用URL一覧 */
        citations?: WebSearchCitation[];
      };
    }
  | { type: "error"; message: string };
```

#### 3. ToolCallInfo 拡張（hooks/useLLMStream/types.ts）

```typescript
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;
  result?: {
    query: string;
    citations?: WebSearchCitation[];
  };
}
```

### GrokClient 変更詳細

#### 変更箇所: `lib/llm/clients/grok.ts`

```typescript
/**
 * ツール呼び出しイベントのパース
 * Phase 2: input（クエリ）を追加
 */
private parseToolCallEvent(
  item: NonNullable<XAIStreamEvent["item"]>,
  status: "running" | "completed",
): (SSEEvent & { type: "tool_call" }) | null {
  const toolType = XAI_TOOL_TYPE_MAP[item.type];
  if (!toolType) return null;

  const baseEvent = {
    type: "tool_call" as const,
    id: item.id,
    name: toolType,
    displayName: TOOL_DISPLAY_NAMES[toolType],
    status,
  };

  // Phase 2: Web検索のクエリを抽出
  if (item.type === "web_search_call" && item.action?.query) {
    return {
      ...baseEvent,
      input: item.action.query,
    };
  }

  // Phase 2: X検索のクエリを抽出
  if (item.type === "custom_tool_call" && item.input) {
    try {
      const inputData = JSON.parse(item.input);
      return {
        ...baseEvent,
        input: inputData.query || item.input,
      };
    } catch {
      // JSONパース失敗時はinputなしで返す
      return baseEvent;
    }
  }

  return baseEvent;
}

/**
 * メッセージイベントのパース
 * Phase 3: citations を抽出
 */
private parseMessageEvent(
  item: XAIStreamEvent["item"],
): { citations: WebSearchCitation[] } | null {
  if (!item || item.type !== "message" || !item.content) {
    return null;
  }

  const citations: WebSearchCitation[] = [];
  
  for (const content of item.content) {
    if (content.annotations) {
      for (const annotation of content.annotations) {
        if (annotation.type === "url_citation") {
          citations.push({
            url: annotation.url,
            title: annotation.title,
            startIndex: annotation.start_index,
            endIndex: annotation.end_index,
          });
        }
      }
    }
  }

  return { citations };
}

/**
 * ストリーミングレスポンス取得（修正版）
 */
async *streamWithUsage(messages: LLMMessage[]): AsyncGenerator<SSEEvent> {
  yield { type: "start" };

  const response = await this.fetchApi(this.buildRequestBody(messages, true));
  // ... エラーハンドリング ...

  const reader = response.body?.getReader();
  // ...

  // citations を一時保存
  const citations: WebSearchCitation[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // ... SSEパース処理 ...

      const sseEvent = processEvent(parsedEvent);
      
      if (sseEvent) {
        // citations を収集
        if (sseEvent.type === "message") {
          const messageData = this.parseMessageEvent(sseEvent.item);
          if (messageData) {
            citations.push(...messageData.citations);
          }
        }
        
        yield sseEvent;
      }
    }

    // done イベントに citations を含める
    yield {
      type: "done",
      usage: {
        // ... 既存のusageデータ ...
        citations,
      },
    };
  } finally {
    reader.releaseLock();
  }
}
```

### useLLMStream 変更詳細

#### 変更箇所: `hooks/useLLMStream/index.ts`

```typescript
export function useLLMStream(options: UseLLMStreamOptions = {}) {
  // ... 既存のstate ...
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  
  // Phase 3: citations を一時保存
  const citationsRef = useRef<WebSearchCitation[]>([]);

  /**
   * ツール呼び出し情報を更新（upsert）
   */
  const upsertToolCall = useCallback((toolCall: ToolCallInfo) => {
    setToolCalls((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === toolCall.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...toolCall };
        return updated;
      }
      return [...prev, toolCall];
    });
  }, []);

  /**
   * citations をツール呼び出しに紐付け
   */
  const assignCitationsToToolCalls = useCallback(() => {
    if (citationsRef.current.length === 0) return;

    setToolCalls((prev) =>
      prev.map((tool) => {
        if (tool.name === "web_search" && !tool.result?.citations) {
          return {
            ...tool,
            result: {
              query: tool.input || "",
              citations: citationsRef.current,
            },
          };
        }
        return tool;
      })
    );
  }, []);

  const startStream = useCallback(
    async (messages: LLMMessage[], provider: LLMProvider, ...): Promise<void> => {
      cleanup();
      citationsRef.current = []; // リセット

      // ... 既存の初期化処理 ...

      try {
        for await (const event of streamLLMResponse(...)) {
          switch (event.type) {
            case "tool_call":
              upsertToolCall({
                id: event.id,
                name: event.name,
                displayName: event.displayName,
                status: event.status,
                input: event.input, // Phase 2: クエリを保存
              });
              break;

            case "done":
              setUsage(event.usage);
              // Phase 3: citations を紐付け
              if (event.usage?.citations) {
                citationsRef.current = event.usage.citations;
                assignCitationsToToolCalls();
              }
              setPhase("complete");
              break;

            // ... 他のcase ...
          }
        }
      } catch (err) {
        // ... エラーハンドリング ...
      }
    },
    [upsertToolCall, assignCitationsToToolCalls, cleanup]
  );

  // ... 既存のresetStream等 ...
}
```

### コンポーネント設計詳細

#### ToolCallMessage コンポーネント

```typescript
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getToolConfig } from "@/lib/tools/config";
import type { ToolCallMessageProps } from "../types";
import { WebSearchDetails } from "./WebSearchDetails";

export function ToolCallMessage({ toolCall, status, provider }: ToolCallMessageProps) {
  const config = getToolConfig(toolCall.name);
  const Icon = config.icon;

  return (
    <div className="flex gap-4 px-4 py-2">
      {/* アイコン */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center 
                      bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
      
      {/* 内容 */}
      <div className="flex-1 max-w-[85%]">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 
                           border border-gray-200">
            {provider}
          </span>
        </div>
        
        {/* メインカード */}
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl 
                        bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm">
          {/* 基本情報 */}
          <div className="flex items-center gap-2 flex-wrap">
            {status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            <span className="font-medium">{config.label}</span>
            
            {/* Phase 2: クエリ表示 */}
            {toolCall.input && (
              <code className="text-xs bg-blue-100/70 px-1.5 py-0.5 rounded 
                              text-blue-800 truncate max-w-[250px]">
                {toolCall.input}
              </code>
            )}
          </div>
          
          {/* Phase 3: 詳細表示 */}
          {toolCall.name === "web_search" && toolCall.result && (
            <WebSearchDetails 
              query={toolCall.result.query}
              citations={toolCall.result.citations || []}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

### エラーハンドリング戦略

| エラーケース | 発生箇所 | 対応 | UX影響 |
|-------------|---------|------|-------|
| JSONパース失敗 | GrokClient (input) | 無視、inputなしで返す | クエリ表示なし（既存動作） |
| URLが無効 | WebSearchDetails | hostname取得をtry-catch | URL表示のみ |
| citationsが空 | useLLMStream | 空配列として処理 | 「参照ソース(0件)」と表示 |
| 重複URL | useLLMStream | Setでユニーク化 | 重複なしで表示 |

### パフォーマンス考慮事項

#### 1. メモ化戦略

```typescript
// ToolCallMessage のメモ化
export const ToolCallMessage = memo(function ToolCallMessage({ ... }) {
  // ...
}, (prev, next) => {
  // toolCall.result が変更された場合のみ再レンダリング
  return (
    prev.toolCall.id === next.toolCall.id &&
    prev.toolCall.status === next.toolCall.status &&
    prev.toolCall.input === next.toolCall.input &&
    JSON.stringify(prev.toolCall.result) === JSON.stringify(next.toolCall.result)
  );
});
```

#### 2. citations の最適化

```typescript
// 最大100件まで保存（無限増殖防止）
const MAX_CITATIONS = 100;

if (citationsRef.current.length < MAX_CITATIONS) {
  citationsRef.current.push(...newCitations.slice(0, MAX_CITATIONS - citationsRef.current.length));
}
```

#### 3. UIの仮想化（将来検討）

引用URLが多い場合（50件以上）の表示最適化：
- 最初の10件のみ表示
- 残りは「他N件」をクリックで展開
- スクロール領域の高さ制限（max-h-60）

### テスト戦略

#### 単体テスト

```typescript
// lib/llm/clients/grok.test.ts
describe("parseToolCallEvent", () => {
  it("web_search_call のクエリを抽出できる", () => {
    const item = {
      type: "web_search_call",
      action: { query: "OpenAI GPT-5" },
    };
    const result = client.parseToolCallEvent(item, "completed");
    expect(result.input).toBe("OpenAI GPT-5");
  });

  it("X検索のinputをパースできる", () => {
    const item = {
      type: "custom_tool_call",
      input: '{"query":"GPT-5","limit":10}',
    };
    const result = client.parseToolCallEvent(item, "completed");
    expect(result.input).toBe("GPT-5");
  });
});
```

#### 統合テスト

```typescript
// hooks/useLLMStream.test.ts
describe("ツール詳細表示", () => {
  it("tool_call イベントでinputが保存される", async () => {
    // ...
  });

  it("done イベントでcitationsが紐付けられる", async () => {
    // ...
  });
});
```

---

## DB設計（案B: 独立テーブル）

### 設計方針

**方針**: xAIから得られる情報を網羅的に保存し、将来の分析・集計に備える。

**理由**:
1. **分析可能性**: 「Web検索は月間何回？」「どのドメインが多く引用された？」等の集計クエリが可能
2. **拡張性**: 新しいフィールドの追加が容易（カラム追加で対応）
3. **整合性**: 外部キー制約でデータ整合性を保証
4. **xAI情報の完全保存**: APIレスポンスの全フィールドを保存

### スキーマ設計

```prisma
// ============================================
// ツール使用履歴（新規テーブル群）
// ============================================

/** 
 * ツール呼び出し履歴
 * xAI APIの各ツール実行を1レコードとして保存
 */
model ToolCall {
  id              String   @id @default(uuid())
  
  // 関連メッセージ
  messageId       String
  message         ResearchMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  // xAI API からの生情報
  externalId      String?   @unique  // xAIの item.id (ws_xxx, xs_call_xxx 等)
  toolType        String            // web_search_call | x_search_call | code_interpreter_call | custom_tool_call
  name            String?           // custom_tool_call の場合 (x_keyword_search, x_semantic_search)
  status          String            // in_progress | completed | failed
  
  // 入力情報（JSONで柔軟に保存）
  inputJson       Json?             // ツールへの入力パラメータ
  inputQuery      String?  @db.Text // 検索クエリ（検索系ツール用、検索・集計用に正規化）
  
  // 実行結果
  actionJson      Json?             // web_search_call の action フィールド
  
  // タイムスタンプ
  startedAt       DateTime          // xAI API event 受信時刻
  completedAt     DateTime?         // status=completed 時刻
  createdAt       DateTime @default(now())
  
  // リレーション
  citations       ToolCitation[]
  
  @@index([messageId])
  @@index([toolType])
  @@index([status])
  @@index([inputQuery])  // 検索クエリでの検索用
  @@index([createdAt])
}

/**
 * URL引用情報
 * Web検索やX検索で参照されたURLを保存
 */
model ToolCitation {
  id          String   @id @default(uuid())
  
  // 関連ツール呼び出し
  toolCallId  String
  toolCall    ToolCall @relation(fields: [toolCallId], references: [id], onDelete: Cascade)
  
  // 引用情報
  url         String   @db.Text
  title       String?  // 表示タイトル（通常は数字"1", "2"等、または実際のタイトル）
  domain      String?  // URLのドメイン部分（集計用）
  
  // テキスト内位置情報
  startIndex  Int?
  endIndex    Int?
  
  createdAt   DateTime @default(now())
  
  @@index([toolCallId])
  @@index([domain])    // ドメイン別集計用
  @@index([url])       // URL重複チェック用
}

/**
 * LLM使用状況履歴
 * メッセージごとのトークン使用量・コストを保存
 */
model LLMUsage {
  id              String   @id @default(uuid())
  
  // 関連メッセージ
  messageId       String   @unique  // 1メッセージに1つのUsage
  message         ResearchMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  // トークン使用量
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int
  
  // コスト（USD）
  costUsd         Float
  
  // xAI API 詳細情報
  inputTokensDetails  Json?  // { cached_tokens: number }
  outputTokensDetails Json?  // { reasoning_tokens: number }
  
  // ツール使用回数
  webSearchCalls      Int @default(0)
  xSearchCalls        Int @default(0)
  codeInterpreterCalls Int @default(0)
  fileSearchCalls     Int @default(0)
  mcpCalls            Int @default(0)
  documentSearchCalls Int @default(0)
  
  // xAI API metadata
  responseId      String?  // xAI response.id
  model           String?  // 使用モデル名
  
  createdAt       DateTime @default(now())
  
  @@index([messageId])
  @@index([createdAt])
  @@index([costUsd])     // コスト集計用
}

/**
 * xAI API 生レスポンス（デバッグ・監査用）
 * 必要に応じて生のAPIレスポンスを保存
 */
model XAIResponseLog {
  id              String   @id @default(uuid())
  
  // 関連チャット
  chatId          String
  
  // API情報
  requestId       String   @unique
  responseId      String?
  model           String
  
  // リクエスト・レスポンス
  requestBody     Json     // 送信したリクエスト
  responseEvents  Json[]   // 受信したSSEイベント配列
  
  // 実行時間
  startedAt       DateTime
  completedAt     DateTime?
  durationMs      Int?     // 実行時間（ミリ秒）
  
  // エラー情報
  errorMessage    String?  @db.Text
  
  createdAt       DateTime @default(now())
  
  @@index([chatId])
  @@index([requestId])
  @@index([createdAt])
}

// ============================================
// 既存テーブルの修正
// ============================================

model ResearchMessage {
  id        String       @id @default(uuid())
  chatId    String
  chat      ResearchChat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role      String       // USER | ASSISTANT | SYSTEM
  content   String       @db.Text
  thinking  String?      @db.Text
  
  // 新規: リレーション
  toolCalls ToolCall[]
  llmUsage  LLMUsage?
  
  createdAt DateTime     @default(now())

  @@index([chatId, createdAt])
}
```

### 保存データ例

#### ToolCall レコード
```json
{
  "id": "tc_abc123",
  "messageId": "msg_def456",
  "externalId": "ws_053f2938-eaa9-8bee-632f-bed61ee8352d_call_58243251",
  "toolType": "web_search_call",
  "name": null,
  "status": "completed",
  "inputJson": {
    "query": "OpenAI GPT-5 latest news release date",
    "limit": 10
  },
  "inputQuery": "OpenAI GPT-5 latest news release date",
  "actionJson": {
    "type": "search",
    "query": "OpenAI GPT-5 latest news release date",
    "sources": []
  },
  "startedAt": "2026-02-26T13:00:00Z",
  "completedAt": "2026-02-26T13:00:05Z"
}
```

#### ToolCitation レコード
```json
{
  "id": "tcit_xyz789",
  "toolCallId": "tc_abc123",
  "url": "https://openai.com/index/introducing-gpt-5",
  "title": "1",
  "domain": "openai.com",
  "startIndex": 145,
  "endIndex": 194
}
```

#### LLMUsage レコード
```json
{
  "id": "usage_001",
  "messageId": "msg_def456",
  "inputTokens": 11716,
  "outputTokens": 2393,
  "totalTokens": 14109,
  "costUsd": 0.229637,
  "inputTokensDetails": { "cached_tokens": 3840 },
  "outputTokensDetails": { "reasoning_tokens": 1049 },
  "webSearchCalls": 2,
  "xSearchCalls": 2,
  "codeInterpreterCalls": 0,
  "responseId": "ws_053f2938-eaa9-8bee-632f-bed61ee8352d",
  "model": "grok-4-1-fast-reasoning"
}
```

### 実装ステップ

#### Step 1: スキーマ変更

```prisma
// prisma/schema.prisma に上記のモデルを追加
```

#### Step 2: マイグレーション

```bash
npx prisma migrate dev --name add_tool_call_tables
```

#### Step 3: Prisma Client 拡張

```typescript
// lib/prisma.ts
// 既存のまま、新しいモデルは自動的に生成される
```

#### Step 4: API Route 修正

```typescript
// app/api/chat/feature/route.ts

// GET: ツール呼び出し・Usage情報を含めて返す
export async function GET(request: NextRequest): Promise<Response> {
  // ...
  const chat = await prisma.researchChat.findFirst({
    where: { id: chatId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          toolCalls: {
            include: { citations: true }
          },
          llmUsage: true,
        }
      },
    },
  });

  // フロントエンド用に変換
  const messages = chat.messages.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase(),
    content: m.content,
    timestamp: m.createdAt,
    llmProvider: chat.llmProvider,
    toolCalls: m.toolCalls.map(tc => ({
      id: tc.id,
      name: tc.toolType.replace('_call', ''),
      displayName: getToolDisplayName(tc.toolType),
      status: tc.status,
      input: tc.inputQuery,
      result: {
        query: tc.inputQuery,
        citations: tc.citations.map(c => ({
          url: c.url,
          title: c.title,
        }))
      }
    })),
    usage: m.llmUsage ? {
      inputTokens: m.llmUsage.inputTokens,
      outputTokens: m.llmUsage.outputTokens,
      cost: m.llmUsage.costUsd,
    } : null,
  }));
}

// POST: ツール呼び出し・Usage情報を保存
export async function POST(request: NextRequest): Promise<Response> {
  // ... バリデーション ...
  
  // メッセージ保存（トランザクション）
  await prisma.$transaction(async (tx) => {
    // メッセージ作成
    const createdMessages = await tx.researchMessage.createMany({
      data: messages.map(msg => ({
        chatId: chat.id,
        role: msg.role.toUpperCase(),
        content: msg.content,
      })),
    });
    
    // 各メッセージの toolCalls と usage を保存
    for (const msg of messages) {
      if (msg.toolCalls?.length > 0) {
        for (const tc of msg.toolCalls) {
          const toolCall = await tx.toolCall.create({
            data: {
              messageId: msg.id,
              externalId: tc.externalId,
              toolType: tc.name + '_call',
              name: tc.name,
              status: tc.status,
              inputJson: tc.input,
              inputQuery: tc.input,
              startedAt: new Date(),
              completedAt: tc.status === 'completed' ? new Date() : null,
            }
          });
          
          // citations 保存
          if (tc.result?.citations?.length > 0) {
            await tx.toolCitation.createMany({
              data: tc.result.citations.map(c => ({
                toolCallId: toolCall.id,
                url: c.url,
                title: c.title,
                domain: new URL(c.url).hostname,
              }))
            });
          }
        }
      }
      
      // usage 保存
      if (msg.usage) {
        await tx.lLMUsage.create({
          data: {
            messageId: msg.id,
            inputTokens: msg.usage.inputTokens,
            outputTokens: msg.usage.outputTokens,
            totalTokens: msg.usage.inputTokens + msg.usage.outputTokens,
            costUsd: msg.usage.cost,
          }
        });
      }
    }
  });
}
```

### データフロー（永続化含む）

```
1. ストリーミング中（リアルタイム）
   ├─ xAI API → GrokClient → SSE
   ├─ useLLMStream: toolCalls を state に保存
   └─ StreamingSteps: リアルタイム表示

2. ストリーミング完了
   ├─ FeatureChat
   │   ├─ assistantMessage を作成
   │   ├─ toolCalls/usage を含める
   │   └─ setMessages で状態更新
   │
   └─ saveConversation
       ├─ POST /api/chat/feature
       ├─ Prisma Transaction
       │   ├─ ResearchMessage 作成
       │   ├─ ToolCall 作成（複数）
       │   ├─ ToolCitation 作成（複数）
       │   └─ LLMUsage 作成
       └─ DB保存完了

3. ページリロード時
   ├─ loadConversation
   │   ├─ GET /api/chat/feature?chatId=xxx
   │   ├─ Prisma include で関連テーブルを取得
   │   └─ フロントエンド用に変換
   │
   └─ 表示
       ├─ MessageBubble: 本文表示
       └─ ToolCallMessage: ツール履歴表示（DBから復元）
```

### 集計クエリ例

```typescript
// 月間ツール使用回数
const monthlyToolUsage = await prisma.toolCall.groupBy({
  by: ['toolType'],
  where: {
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  },
  _count: { id: true }
});

// よく引用されるドメインTOP10
const topDomains = await prisma.toolCitation.groupBy({
  by: ['domain'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 10
});

// ユーザーの総コスト
const totalCost = await prisma.lLMUsage.aggregate({
  where: { message: { chat: { userId } } },
  _sum: { costUsd: true }
});
```

### エッジケース

| ケース | 対応 |
|-------|------|
| 旧データ（テーブルなし） | toolCalls/usage が空配列として返される |
| 同一URLの重複 | ToolCitation.url にインデックスを張り、重複許容（集計時にGROUP BY） |
| URLが無効 | domain抽出時にtry-catch、失敗時はnull |
| 大量citations | 1ツールあたり最大100件まで保存（それ以上はスキップ） |
| トランザクション失敗 | 個別に保存を試行、失敗したものはログ出力 |

---

## 関連ドキュメント

- [xAI Responses API 仕様](../specs/api-integration/xai-responses-api-spec.md)
- [ストリーミングイベント仕様（Legacy）](../archive/2026-02-26-streaming-events-legacy.md)
- [DBスキーマ設計](../specs/api-integration/database-schema.md)
- `scripts/investigate-tool-response.ts`
