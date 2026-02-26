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

## DB設計

### 現状の問題

現在の `ResearchMessage` モデルにはツール使用情報が保存されない：

```prisma
model ResearchMessage {
  id        String       @id @default(uuid())
  chatId    String
  role      String       // USER | ASSISTANT | SYSTEM
  content   String       @db.Text
  thinking  String?      @db.Text
  createdAt DateTime     @default(now())
  // ❌ toolCalls, citations, usage がない
}
```

### 設計方針

#### 案A: Jsonカラムで保存（推奨 - Phase 3以降）

メッセージごとにツール使用情報をJsonで保存。シンプルで実装が容易。

```prisma
model ResearchMessage {
  id        String       @id @default(uuid())
  chatId    String
  role      String       // USER | ASSISTANT | SYSTEM
  content   String       @db.Text
  thinking  String?      @db.Text
  
  // ツール使用情報（JSONで保存）
  toolCalls Json?        // ToolCallInfo[]
  usage     Json?        // UsageInfo（トークン数、コスト）
  
  createdAt DateTime     @default(now())

  @@index([chatId, createdAt])
}
```

**メリット**:
- シンプル、既存コードの変更が最小限
- フロントエンドの型と一致
- クエリが容易

**デメリット**:
- Json内のフィールドで検索が困難
- 正規化されていない

**保存データ例**:
```json
{
  "toolCalls": [
    {
      "id": "ws_xxx",
      "name": "web_search",
      "displayName": "Web検索",
      "status": "completed",
      "input": "OpenAI GPT-5 最新情報",
      "result": {
        "query": "OpenAI GPT-5 最新情報",
        "citations": [
          { "url": "https://openai.com/...", "title": "1" }
        ]
      }
    }
  ],
  "usage": {
    "inputTokens": 11716,
    "outputTokens": 2393,
    "cost": 0.229637
  }
}
```

#### 案B: 独立テーブルで保存（将来的検討）

ツール呼び出しを独立したテーブルで管理。正規化され、詳細な集計が可能。

```prisma
model ResearchMessage {
  id          String       @id @default(uuid())
  chatId      String
  role        String
  content     String       @db.Text
  thinking    String?      @db.Text
  
  // リレーション
  toolCalls   ToolCall[]
  
  createdAt   DateTime     @default(now())
}

model ToolCall {
  id              String           @id @default(uuid())
  messageId       String
  message         ResearchMessage  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  // ツール情報
  toolType        String           // web_search | x_search | code_execution
  displayName     String
  status          String           // running | completed | failed
  input           String?          @db.Text  // 検索クエリなど
  
  // 結果
  citations       ToolCitation[]
  
  createdAt       DateTime         @default(now())
  
  @@index([messageId])
  @@index([toolType])
}

model ToolCitation {
  id          String   @id @default(uuid())
  toolCallId  String
  toolCall    ToolCall @relation(fields: [toolCallId], references: [id], onDelete: Cascade)
  
  url         String
  title       String
  
  @@index([toolCallId])
}
```

**メリット**:
- 正規化されている
- ツール使用状況の集計クエリが可能（「Web検索は月間何回？」など）
- citationsの検索が可能

**デメリット**:
- 実装が複雑
- JOINが増えてパフォーマンスに影響

### 推奨: Phase 3で案A（Json）を実装

**理由**:
1. シンプルさを優先（既存コードの変更が最小限）
2. フロントエンドの型と一致（変換ロジックが不要）
3. 将来必要になったら案Bに移行可能

### 実装ステップ

#### Step 1: スキーマ変更

```prisma
// prisma/schema.prisma
model ResearchMessage {
  id        String       @id @default(uuid())
  chatId    String
  role      String       // USER | ASSISTANT | SYSTEM
  content   String       @db.Text
  thinking  String?      @db.Text
  
  // Phase 3: 追加
  toolCalls Json?
  usage     Json?
  
  createdAt DateTime     @default(now())

  @@index([chatId, createdAt])
}
```

#### Step 2: マイグレーション

```bash
npx prisma migrate dev --name add_tool_calls_to_message
```

#### Step 3: APIの修正

```typescript
// app/api/chat/feature/route.ts

// POST: メッセージ保存時に toolCalls/usage を含める
const saveRequestSchema = z.object({
  chatId: z.string().optional(),
  featureId: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()).optional(),
      llmProvider: z.string().optional(),
      // Phase 3: 追加
      toolCalls: z.array(z.object({
        id: z.string(),
        name: z.string(),
        displayName: z.string(),
        status: z.enum(["running", "completed"]),
        input: z.string().optional(),
        result: z.object({
          query: z.string(),
          citations: z.array(z.object({
            url: z.string(),
            title: z.string(),
          })).optional(),
        }).optional(),
      })).optional(),
      usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        cost: z.number(),
      }).optional(),
    }),
  ),
});

// メッセージ保存時に toolCalls/usage を含める
await prisma.researchMessage.createMany({
  data: messages.map((msg) => ({
    chatId: chat.id,
    role: msg.role.toUpperCase(),
    content: msg.content,
    toolCalls: msg.toolCalls || null,  // ← 追加
    usage: msg.usage || null,          // ← 追加
  })),
});
```

#### Step 4: useConversationSave の修正

```typescript
// hooks/useConversationSave.ts

const saveConversation = useCallback(
  async (updatedMessages: Message[], chatId: string | undefined) => {
    try {
      const response = await fetch("/api/chat/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          featureId,
          messages: updatedMessages.map((msg) => ({
            ...msg,
            // Phase 3: toolCalls/usage を含める
            toolCalls: msg.toolCalls,
            usage: msg.usage,
          })),
        }),
      });
      // ...
    } catch (err) {
      // ...
    }
  },
  [featureId, onChatCreated]
);
```

#### Step 5: Message 型の拡張

```typescript
// components/ui/FeatureChat.tsx

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  // Phase 3: 追加
  toolCalls?: ToolCallInfo[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}
```

### データフロー（永続化含む）

```
1. ストリーミング中
   ├─ useLLMStream: toolCalls, citations を収集
   └─ StreamingSteps: リアルタイム表示

2. ストリーミング完了
   ├─ FeatureChat: assistantMessage を作成（toolCalls/usage を含む）
   ├─ setMessages: 状態更新
   └─ saveConversation: API経由でDB保存

3. ページリロード時
   ├─ loadConversation: DBから履歴を取得
   ├─ toolCalls/usage を含めた Message[] を復元
   └─ MessageBubble: 過去のツール使用履歴を表示
```

### エッジケース

| ケース | 対応 |
|-------|------|
| 旧データ（toolCallsなし） | `undefined` として処理、表示は既存動作 |
| toolCalls が大きすぎる | JSONカラムの制限（PostgreSQLは1GB）内に収まる |
| マイグレーション失敗 | 別マイグレーションとして分離、段階的適用 |

---

## 関連ドキュメント

- [xAI Responses API 仕様](../specs/api-integration/xai-responses-api-spec.md)
- [ストリーミングイベント仕様（Legacy）](../archive/2026-02-26-streaming-events-legacy.md)
- [DBスキーマ設計](../specs/api-integration/database-schema.md)
- `scripts/investigate-tool-response.ts`
