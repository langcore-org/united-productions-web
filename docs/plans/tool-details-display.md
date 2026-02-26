# ツール詳細表示機能 実装計画

> **作成日**: 2026-02-26  
> **優先度**: Medium  
> **関連**: ストリーミング表示改善、UX向上

---

## 概要

現在のツール使用履歴表示はツール名と入力（クエリ）のみを表示するが、**ストリーミング中にツールの詳細（検索結果、実行結果など）をリアルタイムで表示**することで、ユーザーはAIがどの情報に基づいて回答を生成しているかを理解できるようになる。

### 現状の問題

```
[現在の表示]
🔍 Web検索 - "OpenAI GPT-5 発売日"
↓
（結果は見えない）
↓
AI回答: "GPT-5は2025年X月に発売予定です"

[問題]
- 検索結果の信頼性が見えない
- どの情報源に基づいているか不明
- ストリーミング中の体験が単調
```

### 目標とする体験

```
[改善後の表示]
🔍 Web検索 - "OpenAI GPT-5 発売日"
   ├─ 検索クエリ: "OpenAI GPT-5 発売日 2025"
   ├─ 結果1: OpenAI公式ブログ - "GPT-5開発アップデート" (openai.com)
   ├─ 結果2: TechCrunch - "GPT-5は2025年後半に登場か" (techcrunch.com)
   └─ 結果3: ...
↓
AI回答: "GPT-5は2025年X月に発売予定です"
```

---

## 技術調査

### xAI APIのレスポンス構造

現在の `GrokClient` は以下の情報を取得可能：

```typescript
// lib/llm/clients/grok.ts
interface XAIResponse {
  output: Array<
    | {
        type: "message";
        content: Array<{
          type: "output_text";
          text: string;
          annotations?: Array<{ type: "url_citation"; url: string; title?: string }>;
        }>;
      }
    | {
        // ツール呼び出し
        type: "web_search_call" | "x_search_call" | "code_interpreter_call";
        name?: string;
        input?: string;  // ← クエリやコード
        // ❌ 結果は取得していない
      }
  >;
}
```

### 現在のSSEイベント型

```typescript
// lib/llm/types.ts
export type SSEEvent =
  | { type: "tool_call"; id: string; name: string; displayName: string; status: "running" | "completed"; input?: string; }
  | { type: "content"; delta: string; }
  | { type: "done"; usage: {...}; }
  | { type: "error"; message: string; };
```

### 現状のツール情報保持

```typescript
// hooks/useLLMStream/types.ts
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;  // ← 入力のみ、結果はない
}
```

---

## 実装方針

### 案1: xAI APIの結果フィールドを活用（推奨）

xAI Responses APIはツール実行結果を返す可能性がある。`response.output_item.done` イベントで `result` フィールドを確認・活用する。

```typescript
// GrokClientでの結果取得
if (event.type === "response.output_item.done" && event.item) {
  const toolEvent = this.parseToolCallEvent(event.item, "completed");
  if (toolEvent && event.item.result) {
    return {
      ...toolEvent,
      result: event.item.result,  // ← 追加
    };
  }
}
```

### 案2: Web検索結果を独立したSSEイベントとして送信

検索結果が別途返される場合は、専用のイベントタイプを追加：

```typescript
export type SSEEvent =
  | { type: "tool_call"; ... }
  | { type: "tool_result"; toolId: string; result: ToolResult; }  // ← 追加
  | { type: "content"; ... }
  | ...;

interface ToolResult {
  query: string;
  sources: Array<{ title: string; url: string; snippet: string; }>;
}
```

---

## 実装タスク

### Phase 1: 調査・設計（1日）

- [ ] xAI APIの実際のレスポンスをキャプチャして、ツール結果の構造を確認
- [ ] 各ツールタイプ（web_search, x_search, code_execution）の結果構造を調査
- [ ] 表示UIのデザイン案を作成

**調査コマンド例**:
```bash
# 開発環境で実際のAPIレスポンスを確認
curl -X POST https://api.x.ai/v1/responses \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "input": [{"role": "user", "content": "最新のAIニュースを検索して"}],
    "tools": [{"type": "web_search"}],
    "stream": true
  }' -s | tee /tmp/xai_response.log
```

### Phase 2: バックエンド実装（1-2日）

- [ ] `lib/llm/types.ts`: `ToolCallInfo` に `result` フィールドを追加
- [ ] `lib/llm/clients/grok.ts`: 
  - ツール実行結果をパースしてSSEイベントに含める
  - 各ツールタイプに応じた結果構造の正規化
- [ ] 必要に応じて新しいSSEイベントタイプ `tool_result` を追加

**変更予定ファイル**:
```typescript
// lib/llm/types.ts
export interface ToolCallResult {
  query?: string;           // 検索クエリ
  sources?: Array<{        // 検索結果（web_search, x_search）
    title: string;
    url: string;
    snippet?: string;
  }>;
  code?: string;            // 実行したコード（code_execution）
  output?: string;          // 実行結果（code_execution）
  error?: string;           // エラーメッセージ
}

export type SSEEvent =
  | { 
      type: "tool_call"; 
      id: string; 
      name: string; 
      displayName: string; 
      status: "running" | "completed"; 
      input?: string;
      result?: ToolCallResult;  // ← 追加
    }
  | ...;
```

### Phase 3: フロントエンド実装（2-3日）

- [ ] `hooks/useLLMStream/types.ts`: `ToolCallInfo` に `result` を追加
- [ ] `hooks/useLLMStream/index.ts`: `tool_result` イベントを処理
- [ ] `components/chat/messages/ToolCallMessage.tsx`: 詳細表示UIを実装
- [ ] ツールタイプ別の表示コンポーネント作成
  - `WebSearchResults.tsx`: 検索結果リスト表示
  - `XSearchResults.tsx`: X検索結果表示
  - `CodeExecutionResult.tsx`: コード実行結果表示

**UIデザイン案**:
```typescript
// components/chat/messages/WebSearchResults.tsx
interface WebSearchResultsProps {
  result: {
    query: string;
    sources: Array<{ title: string; url: string; snippet?: string }>;
  };
}

export function WebSearchResults({ result }: WebSearchResultsProps) {
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs text-gray-500">
        検索クエリ: <span className="font-mono bg-gray-100 px-1 rounded">{result.query}</span>
      </div>
      <div className="space-y-1">
        {result.sources.map((source, i) => (
          <div key={i} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
            <a href={source.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline font-medium">
              {source.title}
            </a>
            <p className="text-gray-600 mt-0.5 line-clamp-2">{source.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 4: テスト・調整（1日）

- [ ] 各ツールタイプで動作確認
- [ ] 検索結果が多い場合のスクロール/折りたたみ対応
- [ ] モバイル表示対応
- [ ] アクセシビリティ対応（キーボードナビゲーション）

---

## 型定義の変更計画

### 1. 新規ファイル: `lib/llm/tools/types.ts`

```typescript
/**
 * ツール実行結果の型定義
 */

export interface WebSearchResult {
  type: "web_search";
  query: string;
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
    publishedDate?: string;
  }>;
}

export interface XSearchResult {
  type: "x_search";
  query: string;
  posts: Array<{
    author: string;
    content: string;
    url: string;
    postedAt?: string;
  }>;
}

export interface CodeExecutionResult {
  type: "code_execution";
  code: string;
  output?: string;
  error?: string;
  executionTime?: number;
}

export type ToolResult = WebSearchResult | XSearchResult | CodeExecutionResult;

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

### 2. 既存型の更新

```typescript
// lib/llm/types.ts - SSEEvent
export type SSEEvent =
  | { type: "start" }
  | { 
      type: "tool_call"; 
      id: string; 
      name: GrokToolType;
      displayName: string;
      status: "running" | "completed";
      input?: string;
      result?: ToolResult;  // ← 追加
    }
  | { type: "content"; delta: string }
  | { type: "done"; usage: {...} }
  | { type: "error"; message: string };
```

```typescript
// hooks/useLLMStream/types.ts - ToolCallInfo
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;
  result?: ToolResult;  // ← 追加
}
```

---

## 表示UIの詳細設計

### ToolCallMessage コンポーネントの拡張

```typescript
// components/chat/messages/ToolCallMessage.tsx
export function ToolCallMessage({ toolCall, status, provider }: ToolCallMessageProps) {
  const config = getToolConfig(toolCall.name);
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex gap-4 px-4 py-2">
      {/* アイコン */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
      
      {/* 内容 */}
      <div className="flex-1 max-w-[85%]">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
        </div>
        
        {/* メインカード */}
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm">
          {/* 基本情報 */}
          <div className="flex items-center gap-2">
            {status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            <span className="font-medium">{config.label}</span>
            {toolCall.input && (
              <span className="text-blue-700/70 text-xs truncate max-w-[200px]">
                {toolCall.input}
              </span>
            )}
          </div>
          
          {/* 詳細表示（展開時） */}
          {toolCall.result && (
            <div className="mt-3 pt-3 border-t border-blue-200/50">
              {toolCall.name === "web_search" && (
                <WebSearchResults result={toolCall.result} />
              )}
              {toolCall.name === "x_search" && (
                <XSearchResults result={toolCall.result} />
              )}
              {toolCall.name === "code_execution" && (
                <CodeExecutionResult result={toolCall.result} />
              )}
            </div>
          )}
          
          {/* 展開/折りたたみボタン（結果がある場合） */}
          {toolCall.result && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {isExpanded ? (
                <><ChevronUp className="w-3 h-3" /> 詳細を隠す</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> 詳細を表示</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 考慮事項

### プライバシー・セキュリティ

- 検索結果には外部リンクが含まれる → `rel="noopener noreferrer"` で対策
- コード実行結果の表示 → 長すぎる場合は切り詰め

### パフォーマンス

- 検索結果が多い場合（10件以上）→ 最初の3件のみ表示、残りは「他N件」をクリックで展開
- 画像やメディアは含めない（テキストのみ）

### エラーハンドリング

```typescript
// ツール実行失敗時の表示
if (toolCall.status === "failed") {
  return (
    <div className="flex items-center gap-2 text-red-600">
      <XCircle className="w-4 h-4" />
      <span>{config.label} に失敗しました</span>
      {toolCall.result?.error && (
        <span className="text-xs text-red-500">({toolCall.result.error})</span>
      )}
    </div>
  );
}
```

---

## 将来の拡張案

### Phase 2: インタラクティブ機能

- **検索結果の再試行**: ユーザーが検索クエリを修正して再実行
- **結果のピン留め**: 重要なソースをピン留めして参照しやすくする
- **関連検索**: 検索結果から関連クエリを提案

### Phase 3: 履歴保存

- ツール実行結果をDBに保存 → 過去の会話でも結果を参照可能に
- 検索結果のキャッシュ（同じクエリの場合）

---

## 関連ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/tools/types.ts` | 新規: ツール結果型定義 |
| `lib/llm/types.ts` | SSEEvent に `result` 追加 |
| `lib/llm/clients/grok.ts` | ツール結果パース処理 |
| `hooks/useLLMStream/types.ts` | ToolCallInfo に `result` 追加 |
| `hooks/useLLMStream/index.ts` | 結果イベント処理 |
| `components/chat/messages/ToolCallMessage.tsx` | 詳細表示UI |
| `components/chat/messages/WebSearchResults.tsx` | 新規: Web検索結果表示 |
| `components/chat/messages/XSearchResults.tsx` | 新規: X検索結果表示 |
| `components/chat/messages/CodeExecutionResult.tsx` | 新規: コード実行結果表示 |

---

## 参考資料

- [xAI Responses API Documentation](https://docs.x.ai/docs/responses)
- `docs/specs/api-integration/streaming-events.md`
- `docs/lessons/2026-02-26-chat-streaming-loading-issue.md`
