# xAI Responses API 仕様（調査結果）

> **作成日**: 2026-02-26  
> **調査対象**: xAI Responses API (stream=true, tools含む)  
> **調査スクリプト**: `scripts/investigate-tool-response.ts`

---

## 概要

xAI Responses API のストリーミングレスポンスの構造を実際のAPI呼び出しで調査した結果を記載する。

**調査時のリクエスト**:
```json
{
  "model": "grok-4-1-fast-reasoning",
  "input": [{"role": "user", "content": "OpenAI GPT-5について最新情報を検索して"}],
  "stream": true,
  "tools": [{"type": "web_search"}, {"type": "x_search"}]
}
```

---

## イベントシーケンス

ストリーミング時のイベント発生順序：

```
1. response.created
2. response.in_progress
3. response.output_item.added (web_search_call #1)
4. response.web_search_call.in_progress
5. response.web_search_call.searching
6. response.output_item.added (web_search_call #2)
7. response.web_search_call.in_progress
8. response.web_search_call.searching
9. response.output_item.added (x_search custom_tool_call #1)
10. response.custom_tool_call_input.delta
11. response.custom_tool_call_input.done
12. response.output_item.added (x_search custom_tool_call #2)
13. response.custom_tool_call_input.delta
14. response.custom_tool_call_input.done
15. response.web_search_call.completed
16. response.output_item.done (web_search_call #1)
17. response.web_search_call.completed
18. response.output_item.done (web_search_call #2)
19. response.output_item.done (x_search #1)
20. response.output_item.done (x_search #2)
21. response.output_item.added (message)
22. response.content_part.added
23. response.output_text.delta (複数回)
24. response.output_text.annotation.added (複数回)
25. response.output_text.done
26. response.content_part.done
27. response.output_item.done (message)
28. response.completed
```

---

## 各イベントの詳細

### 1. response.created / response.in_progress

レスポンス開始を示すイベント。

```json
{
  "type": "response.created",
  "response": {
    "id": "ws_xxxx",
    "model": "grok-4-1-fast-reasoning",
    "tools": [{"type": "web_search"}, {"type": "x_search"}],
    "status": "in_progress"
  }
}
```

### 2. response.output_item.added (web_search_call)

Web検索ツール呼び出し開始。

```json
{
  "type": "response.output_item.added",
  "item": {
    "id": "ws_xxxxx_call_xxxxx",
    "type": "web_search_call",
    "status": "in_progress",
    "action": {
      "type": "search",
      "query": "",           // ← 初期値は空
      "sources": []          // ← 常に空
    }
  },
  "output_index": 0
}
```

### 3. response.web_search_call.searching

検索実行中を示すイベント（追加情報なし）。

```json
{
  "type": "response.web_search_call.searching",
  "item_id": "ws_xxxxx_call_xxxxx",
  "output_index": 0
}
```

### 4. response.output_item.added (custom_tool_call for X)

X検索ツール呼び出し開始。`web_search_call` とは異なり `custom_tool_call` として処理される。

```json
{
  "type": "response.output_item.added",
  "item": {
    "call_id": "xs_call_xxxxx",
    "input": "",              // ← 初期値は空
    "name": "x_keyword_search", // または "x_semantic_search"
    "type": "custom_tool_call",
    "id": "ctc_xxxxx_xs_call_xxxxx",
    "status": "in_progress"
  },
  "output_index": 2
}
```

### 5. response.custom_tool_call_input.delta / done

X検索の入力（クエリ）が確定。

```json
// delta
{
  "type": "response.custom_tool_call_input.delta",
  "item_id": "ctc_xxxxx_xs_call_xxxxx",
  "output_index": 2,
  "delta": "{\"query\":\"(\\\"GPT-5\\\" OR \\\"GPT 5\\\" OR GPT5) (from:OpenAI OR from:sama)\",\"limit\":10,\"mode\":\"Latest\"}"
}

// done
{
  "type": "response.custom_tool_call_input.done",
  "item_id": "ctc_xxxxx_xs_call_xxxxx",
  "output_index": 2,
  "input": "{\"query\":\"(\\\"GPT-5\\\" OR \\\"GPT 5\\\" OR GPT5) (from:OpenAI OR from:sama)\",\"limit\":10,\"mode\":\"Latest\"}"
}
```

### 6. response.output_item.done (web_search_call)

**重要**: Web検索完了時のデータ構造。

```json
{
  "type": "response.output_item.done",
  "item": {
    "id": "ws_xxxxx_call_xxxxx",
    "type": "web_search_call",
    "status": "completed",
    "action": {
      "type": "search",
      "query": "OpenAI GPT-5 latest news release date",  // ← 検索クエリ
      "sources": []  // ← 常に空！結果は含まれない
    }
  }
}
```

**注意**: `sources` は常に空配列。検索結果は `message` の `annotations` に含まれる。

### 7. response.output_item.done (custom_tool_call)

X検索完了時のデータ構造。

```json
{
  "type": "response.output_item.done",
  "item": {
    "call_id": "xs_call_xxxxx",
    "input": "{\"query\":\"OpenAI GPT-5 release updates\",\"limit\":10}",
    "name": "x_semantic_search",
    "type": "custom_tool_call",
    "id": "ctc_xxxxx_xs_call_xxxxx",
    "status": "completed"
  }
}
```

**注意**: X検索の結果はAPIレスポンスに含まれない（プライバシー保護のため）。

### 8. response.output_item.done (message)

AI生成メッセージ完成時のデータ構造。

```json
{
  "type": "response.output_item.done",
  "item": {
    "content": [
      {
        "type": "output_text",
        "text": "### OpenAI GPT-5の最新情報...",
        "annotations": [
          {
            "type": "url_citation",
            "url": "https://openai.com/index/introducing-gpt-5",
            "start_index": 145,
            "end_index": 194,
            "title": "1"
          },
          // ... 複数の引用
        ]
      }
    ],
    "id": "msg_xxxxx",
    "role": "assistant",
    "type": "message",
    "status": "completed"
  }
}
```

**重要**: `annotations` に `url_citation` として検索結果のURLが含まれる。

### 9. response.completed

レスポンス完了時のデータ構造。

```json
{
  "type": "response.completed",
  "response": {
    "usage": {
      "input_tokens": 11716,
      "output_tokens": 2393,
      "total_tokens": 14109,
      "num_sources_used": 0,  // ← 常に0？
      "num_server_side_tools_used": 4,
      "cost_in_usd_ticks": 229637000,
      "server_side_tool_usage_details": {
        "web_search_calls": 2,
        "x_search_calls": 2,
        "code_interpreter_calls": 0,
        "file_search_calls": 0,
        "mcp_calls": 0,
        "document_search_calls": 0
      }
    },
    "output": [
      { "type": "web_search_call", ... },
      { "type": "web_search_call", ... },
      { "type": "custom_tool_call", ... },
      { "type": "custom_tool_call", ... },
      { "type": "message", ... }
    ]
  }
}
```

---

## 調査から得られた知見

### 1. 検索結果の取得方法

| ツールタイプ | 結果の取得場所 | 注意事項 |
|-------------|---------------|---------|
| **web_search** | `message.annotations.url_citation` | `web_search_call.sources` は常に空 |
| **x_search** | **取得不可** | プライバシー保護のため結果は含まれない |
| **code_execution** | （調査未実施） | 別途調査が必要 |

### 2. ツール呼び出しと結果の紐付け

`web_search_call` と `message.annotations` の間に明示的な紐付け（ID等）は存在しない。

**推奨される紐付け方法**:
1. レスポンス内の `web_search_call` を順序で記録
2. 同じレスポンス内の `message.annotations` を収集
3. タイミングベースで関連付け（同じレスポンス内のツール結果と推定）

### 3. 引用情報の構造

```typescript
interface URLCitation {
  type: "url_citation";
  url: string;           // 引用元URL
  start_index: number;   // テキスト内の開始位置
  end_index: number;     // テキスト内の終了位置
  title: string;         // 表示用タイトル（通常は数字"1", "2"など）
}
```

### 4. ツール使用状況の集計

`response.completed.usage.server_side_tool_usage_details` で集計値が取得可能：

```json
{
  "web_search_calls": 2,
  "x_search_calls": 2,
  "code_interpreter_calls": 0,
  "file_search_calls": 0,
  "mcp_calls": 0,
  "document_search_calls": 0
}
```

---

## 実装時の注意点

### 1. Web検索結果の表示

```typescript
// 推奨実装パターン
const toolCalls: Map<string, ToolCallInfo> = new Map();
const citations: URLCitation[] = [];

for await (const event of stream) {
  if (event.type === "response.output_item.done") {
    if (event.item.type === "web_search_call") {
      // 検索クエリを記録
      toolCalls.set(event.item.id, {
        id: event.item.id,
        name: "web_search",
        query: event.item.action.query,  // ← 検索クエリ
        citations: []  // 後で紐付け
      });
    }
    
    if (event.item.type === "message") {
      // 引用を収集
      for (const content of event.item.content) {
        if (content.annotations) {
          citations.push(...content.annotations.filter(a => a.type === "url_citation"));
        }
      }
    }
  }
}

// 紐付け（同じレスポンス内のツールに紐付ける）
const webSearchCalls = Array.from(toolCalls.values()).filter(t => t.name === "web_search");
webSearchCalls.forEach((toolCall, index) => {
  // シンプルな方法: 全引用を全Web検索に紐付ける
  // または、テキスト内の参照番号で紐付けを試みる
  toolCall.citations = citations;
});
```

### 2. X検索の扱い

X検索の結果はAPIレスポンスに含まれないため、以下のように表示する：

```typescript
{
  type: "x_search",
  query: "GPT-5 from:OpenAI",
  result: null,  // 結果は非公開
  note: "検索結果はプライバシー保護のため表示されません"
}
```

---

## 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [ツール詳細表示機能実装計画](../../plans/tool-details-display.md) | 本調査結果に基づく機能実装計画 |
| [ストリーミングイベント仕様（Legacy）](../../archive/2026-02-26-streaming-events-legacy.md) | LangChain時代の旧仕様（アーカイブ済み） |
| [LLM統合概要](./llm-integration-overview.md) | LLM統合の全体的な設計 |
| [xAI 公式ドキュメント](https://docs.x.ai/docs/responses) | xAI Responses API の公式リファレンス |

---

## 調査データ

- **調査スクリプト**: `scripts/investigate-tool-response.ts`
- **キャプチャデータ**: `/tmp/xai_tool_investigation.json`（一時ファイル）
- **総イベント数**: 665イベント
- **ツール呼び出し数**: 4件（Web検索2件、X検索2件）
- **引用URL数**: 18件
