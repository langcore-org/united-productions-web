# ツール詳細表示機能 実装計画

> **作成日**: 2026-02-26  
> **Phase 1 完了日**: 2026-02-26  
> **優先度**: Medium  
> **関連**: ストリーミング表示改善、UX向上

---

## Phase 1 調査結果（完了）

### xAI API レスポンス構造の分析

実際のAPIレスポンスをキャプチャして調査した結果、以下の重要な発見が得られました。

**詳細な調査結果は specs ドキュメントを参照**:
- [xAI Responses API 仕様](../specs/api-integration/xai-responses-api-spec.md)
- 調査スクリプト: `scripts/investigate-tool-response.ts`
- キャプチャデータ: `/tmp/xai_tool_investigation.json`

#### 🔍 主要な発見

| 項目 | 発見内容 | 実装への影響 |
|------|---------|-------------|
| **Web検索結果** | `sources` フィールドは**常に空** | `action.query` で検索クエリのみ取得可能 |
| **検索結果の実体** | `message.content.annotations` に `url_citation` として含まれる | AI回答内の引用リンクとして取得可能 |
| **X検索** | `custom_tool_call` として処理される | `input` でクエリ取得可能、**結果は非公開** |
| **ツール結果フィールド** | `result` フィールドは**存在しない** | 独自の方法で情報を収集する必要あり |

#### 📡 イベントフロー

```
1. response.output_item.added (web_search_call)
   └─ item.action.query: "" (初期値は空)

2. response.web_search_call.searching
   └─ 検索実行中

3. response.output_item.done (web_search_call)
   └─ item.action.query: "実際の検索クエリ"
   └─ item.action.sources: [] (常に空)

4. response.output_item.done (message)
   └─ item.content[0].annotations: [  ← 検索結果はここ！
        { type: "url_citation", url: "...", title: "..." }
      ]
```

#### 📝 実際のデータ構造

**Web検索完了時**:
```json
{
  "id": "ws_xxxx_call_xxx",
  "type": "web_search_call",
  "status": "completed",
  "action": {
    "type": "search",
    "query": "OpenAI GPT-5 latest news release date",
    "sources": []  // ← 常に空
  }
}
```

**X検索完了時**:
```json
{
  "call_id": "xs_call_xxx",
  "input": "{\"query\":\"GPT-5 from:OpenAI\",\"limit\":10}",
  "name": "x_keyword_search",
  "type": "custom_tool_call",
  "status": "completed"
  // ← result フィールドは存在しない
}
```

**メッセージ内の引用情報**:
```json
{
  "type": "message",
  "content": [{
    "type": "output_text",
    "text": "### OpenAI GPT-5の最新情報...",
    "annotations": [
      {
        "type": "url_citation",
        "url": "https://openai.com/index/introducing-gpt-5",
        "start_index": 145,
        "end_index": 194,
        "title": "1"
      }
    ]
  }]
}
```

---

## 実装方針（調査結果に基づく更新）

### 方針: 取得可能な情報を最大限活用

xAI APIの制約内で、**以下の情報をツール詳細として表示**する：

| ツールタイプ | 表示可能な情報 | 取得方法 |
|-------------|---------------|---------|
| **Web検索** | 検索クエリ、引用URL一覧 | `action.query` + `message.annotations` |
| **X検索** | 検索クエリのみ | `input` JSONから抽出 |
| **コード実行** | コード、出力、エラー | （要別途調査） |

### 表示戦略

```
🔍 Web検索
   ├─ 検索クエリ: "OpenAI GPT-5 最新情報"
   └─ 参照ソース (18件):
      ├─ [1] openai.com/index/introducing-gpt-5
      ├─ [2] cbsnews.com/news/...
      └─ ... 他16件

🐦 X検索  
   └─ 検索クエリ: "GPT-5 from:OpenAI"
   └─ （検索結果は非公開）
```

---

## 実装タスク

### Phase 1: 調査・設計 ✅ 完了

- [x] xAI APIの実際のレスポンスをキャプチャ
- [x] 各ツールタイプの結果構造を調査
- [x] 表示UIのデザイン案を作成

**調査結果**:
- Web検索: `action.query` でクエリ、`message.annotations` で引用URL
- X検索: `input` でクエリ取得可能、結果は非公開
- ツール実行結果（`result` フィールド）は存在しない

### Phase 2: バックエンド実装（1-2日）

- [ ] `lib/llm/types.ts`: 
  - `ToolCallInfo` に `result` フィールドを追加（拡張性のため）
  - `WebSearchResult`, `XSearchResult` 型を定義
  
- [ ] `lib/llm/clients/grok.ts`:
  - `response.output_item.done` (web_search_call) で `action.query` を取得
  - `response.output_item.done` (message) で `annotations` を収集
  - `url_citation` をツール呼び出しに紐付け

- [ ] 新しいSSEイベントの検討:
  ```typescript
  // 案: ツール結果をまとめて送信
  { 
    type: "tool_result"; 
    toolId: string; 
    result: {
      query: string;
      citations: Array<{ url: string; title: string }>;
    };
  }
  ```

**変更予定ファイル**:
```typescript
// lib/llm/types.ts
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;  // 検索クエリ
  result?: {
    query: string;
    citations?: Array<{
      url: string;
      title: string;
    }>;
  };
}
```

### Phase 3: フロントエンド実装（2-3日）

- [ ] `hooks/useLLMStream/types.ts`: `ToolCallInfo` に `result` を追加
- [ ] `hooks/useLLMStream/index.ts`: 
  - `message` イベントで `annotations` を収集
  - 対応するツール呼び出しに `citations` を紐付け
  
- [ ] `components/chat/messages/ToolCallMessage.tsx`: 詳細表示UIを実装
- [ ] `components/chat/messages/WebSearchDetails.tsx`: 新規作成
  - 検索クエリ表示
  - 引用URLリスト表示（折りたたみ可能）

**UIデザイン案**:
```typescript
// components/chat/messages/WebSearchDetails.tsx
interface WebSearchDetailsProps {
  query: string;
  citations: Array<{ url: string; title: string }>;
}

export function WebSearchDetails({ query, citations }: WebSearchDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="mt-3 pt-3 border-t border-blue-200/50">
      {/* 検索クエリ */}
      <div className="text-xs text-blue-700/80 mb-2">
        <span className="font-medium">検索:</span>
        <code className="ml-1 bg-blue-100 px-1.5 py-0.5 rounded">
          {query}
        </code>
      </div>
      
      {/* 引用ソース */}
      {citations.length > 0 && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            参照ソース ({citations.length}件)
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {citations.map((citation, i) => (
                <div key={i} className="text-xs p-2 bg-white/50 rounded">
                  <a 
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block"
                  >
                    [{i + 1}] {citation.title}
                  </a>
                  <span className="text-blue-400/70 truncate block mt-0.5">
                    {new URL(citation.url).hostname}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Phase 4: テスト・調整（1日）

- [ ] Web検索のクエリ表示確認
- [ ] 引用URLの表示・リンク動作確認
- [ ] X検索のクエリ表示確認
- [ ] モバイル表示対応
- [ ] アクセシビリティ対応

---

## 型定義の変更計画

### 1. 新規ファイル: `lib/llm/tools/types.ts`

```typescript
/**
 * ツール実行結果の型定義
 * 
 * 注意: xAI APIは直接的なツール結果を返さない。
 * 代わりに、message.annotations から情報を抽出する。
 */

export interface WebSearchCitation {
  url: string;
  title: string;
  startIndex?: number;
  endIndex?: number;
}

export interface WebSearchResult {
  type: "web_search";
  query: string;
  citations: WebSearchCitation[];
}

export interface XSearchResult {
  type: "x_search";
  query: string;
  // X検索の結果はAPIレスポンスに含まれない（プライバシー保護）
}

export interface CodeExecutionResult {
  type: "code_execution";
  code?: string;
  output?: string;
  error?: string;
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
      input?: string;  // 検索クエリ
    }
  | { 
      type: "tool_result";  // ← 新規追加
      toolId: string;
      result: ToolResult;
    }
  | { type: "content"; delta: string }
  | { 
      type: "done"; 
      usage: {
        inputTokens: number;
        outputTokens: number;
        cost: number;
        toolCalls: Record<string, number>;
        citations?: WebSearchCitation[];  // ← 追加
      };
    }
  | { type: "error"; message: string };
```

```typescript
// hooks/useLLMStream/types.ts - ToolCallInfo
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;  // 検索クエリやコード
  result?: ToolResult;  // ← 追加
}
```

---

## データフローの設計

### GrokClient → useLLMStream のデータ連携

```
1. GrokClient.streamWithUsage()
   ├─ web_search_call completed
   │  └─ action.query を抽出 → tool_call イベントに input として含める
   │
   ├─ message completed  
   │  └─ content.annotations から url_citation を抽出
   │  └─ 対応する tool_call に citations を紐付け
   │
   └─ done
      └─ 全 citations を usage に含める

2. useLLMStream
   ├─ tool_call イベント → toolCalls 配列に追加
   ├─ tool_result イベント → 対応 toolCall.result に設定
   └─ done イベント → citations を使用状況に表示
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
          
          {/* 詳細表示（Web検索の場合） */}
          {toolCall.name === "web_search" && toolCall.result && (
            <WebSearchDetails 
              query={toolCall.result.query}
              citations={toolCall.result.citations || []}
            />
          )}
          
          {/* 詳細表示（X検索の場合） */}
          {toolCall.name === "x_search" && toolCall.result && (
            <XSearchDetails query={toolCall.result.query} />
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 考慮事項

### API制約への対応

| 制約 | 対応策 |
|-----|-------|
| Web検索の `sources` が空 | `message.annotations` から `url_citation` を収集 |
| X検索結果が非公開 | クエリのみ表示、「検索結果は非公開」と表示 |
| ツールと引用の紐付けが不明確 | タイミングベースで推定（同じレスポンス内） |

### プライバシー・セキュリティ

- 外部リンクは `rel="noopener noreferrer"` で対策
- 長すぎるURLは切り詰めて表示

### パフォーマンス

- 引用が多い場合（18件以上）は初期表示を3件に制限
- 残りは「他N件」をクリックで展開

---

## 関連ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/tools/types.ts` | 新規: ツール結果型定義 |
| `lib/llm/types.ts` | SSEEvent に `tool_result` 追加 |
| `lib/llm/clients/grok.ts` | 検索クエリ・引用情報の抽出 |
| `hooks/useLLMStream/types.ts` | ToolCallInfo に `result` 追加 |
| `hooks/useLLMStream/index.ts` | 引用情報の収集・紐付け |
| `components/chat/messages/ToolCallMessage.tsx` | 詳細表示UI |
| `components/chat/messages/WebSearchDetails.tsx` | 新規: Web検索詳細 |
| `components/chat/messages/XSearchDetails.tsx` | 新規: X検索詳細 |

---

## 参考資料

- [xAI Responses API Documentation](https://docs.x.ai/docs/responses)
- `docs/specs/api-integration/streaming-events.md`
- `docs/lessons/2026-02-26-chat-streaming-loading-issue.md`
- `/tmp/xai_tool_investigation.json` (Phase 1 調査データ)
