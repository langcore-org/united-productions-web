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

## 関連ドキュメント

- [xAI Responses API 仕様](../specs/api-integration/xai-responses-api-spec.md)
- [ツール詳細表示機能実装計画](./tool-details-display.md)
- `scripts/investigate-tool-response.ts`
