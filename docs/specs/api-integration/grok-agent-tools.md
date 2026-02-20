# Grok Agent Tools API 仕様

> **最終更新**: 2026-02-20 19:30

---

## 概要

xAIのAgent Tools APIは、Grokモデルにサーバーサイドで実行されるツールを提供します。これにより、AIは自律的にツールを使いこなし、Web検索、X検索、コード実行、ドキュメント検索などを行うことができます。

### ツールの種類

| 種類 | 説明 | 例 |
|------|------|-----|
| **組み込みツール (Built-in Tools)** | xAIのサーバーで自動実行されるサーバーサイドツール | Web Search, X Search, Code Execution, Collections Search |
| **関数呼び出し (Function Calling)** | 開発者が定義したカスタム関数 | データベースクエリ、API呼び出し、独自ビジネスロジック |

---

## 重要な変更履歴

### 2026-02-20: X Searchツール名の変更

**問題**: xAI APIで `x_search` ツールを使用すると以下のエラーが発生

```
xAI API error: 422 Failed to deserialize the JSON body into the target type: 
tools[0].type: unknown variant `x_search`, expected `function` or `live_search` 
at line 1 column 5457
```

**原因**: xAI APIの仕様変更により、X検索ツールの識別子が `x_search` から `live_search` に変更された。

**対応**: 以下のファイルを修正

| ファイル | 変更内容 |
|---------|---------|
| `lib/llm/clients/grok.ts` | `GROK_TOOLS.x_search` → `GROK_TOOLS.live_search` |
| `lib/settings/db.ts` | `GrokToolType` から `'x_search'` を `'live_search'` に変更 |
| `app/admin/grok-tools/page.tsx` | ツール名表示を `live_search` に変更 |

**修正前**:
```typescript
tools.push({ type: 'x_search' });
```

**修正後**:
```typescript
tools.push({ type: 'live_search' });
```

### 2025-12-15: Live Search APIの廃止

**旧API**: Live Search API（`search_parameters` パラメータを使用）

**新API**: Agent Tools API（`tools` パラメータを使用）

**移行理由**:
- Live Search APIは2025年12月15日に廃止
- Agent Tools APIはより高度なエージェント機能を提供
- ツールの組み合わせが可能（Web Search + X Search + Code Execution）

参照: [xAI Release Notes - October 2025](https://docs.x.ai/developers/release-notes)

### 2025-11-07: 新ツールの追加

- **Collections Search Tool**: アップロードしたナレッジベースの検索
- **Remote MCP Tools**: リモートMCPサーバーからのツール使用
- **クライアント/サーバーサイドツールの混在**: 同じ会話で両方のツールタイプを使用可能

---

## ツール一覧

### 1. Web Search (`web_search`)

| 項目 | 内容 |
|------|------|
| **名前** | Web検索 |
| **API名** | `web_search` |
| **説明** | インターネットからリアルタイムで最新情報を検索・閲覧 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning, Grok 4 |

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `allowed_domains` | `string[]` | 任意 | 検索対象ドメインを限定（最大5つ）。`excluded_domains` と同時使用不可 |
| `excluded_domains` | `string[]` | 任意 | 除外ドメインを指定（最大5つ）。`allowed_domains` と同時使用不可 |
| `enable_image_understanding` | `boolean` | 任意 | 検索結果の画像解析を有効化。有効化すると `view_image` ツールも使用可能に |

#### 使用例

```typescript
// 基本的な使用
const tools = [{ type: 'web_search' }];

// 特定ドメインのみ検索
const tools = [{
  type: 'web_search',
  allowed_domains: ['github.com', 'stackoverflow.com']
}];

// 画像解析付き
const tools = [{
  type: 'web_search',
  enable_image_understanding: true
}];
```

---

### 2. X Search (`live_search`)

| 項目 | 内容 |
|------|------|
| **名前** | X検索 |
| **API名** | `live_search`（旧: `x_search`） |
| **説明** | X（Twitter）からリアルタイム投稿、ユーザー、スレッドを検索 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning, Grok 4 |

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `allowed_x_handles` | `string[]` | 任意 | 特定アカウントの投稿のみ検索（最大10つ） |
| `excluded_x_handles` | `string[]` | 任意 | 特定アカウントを除外（最大10つ） |
| `from_date` | `string` | 任意 | 検索開始日（ISO8601形式: `YYYY-MM-DD`） |
| `to_date` | `string` | 任意 | 検索終了日（ISO8601形式: `YYYY-MM-DD`） |
| `enable_image_understanding` | `boolean` | 任意 | X投稿内の画像解析を有効化 |
| `enable_video_understanding` | `boolean` | 任意 | X投稿内の動画解析を有効化 |

#### 使用例

```typescript
// 基本的な使用
const tools = [{ type: 'live_search' }];

// 特定アカウントのみ検索
const tools = [{
  type: 'live_search',
  allowed_x_handles: ['techcrunch', 'verge']
}];

// 日付範囲指定
const tools = [{
  type: 'live_search',
  from_date: '2025-02-01',
  to_date: '2025-02-20'
}];
```

#### 注意事項

- `web_search` で `enable_image_understanding: true` を設定すると、同時に `live_search` も画像解析が有効化される
- X Searchはリアルタイムデータにアクセスするため、最新のトレンド情報を取得可能

---

### 3. Code Execution (`code_execution`)

| 項目 | 内容 |
|------|------|
| **名前** | コード実行 |
| **API名** | `code_execution` |
| **説明** | Pythonコードを安全なサンドボックス環境で実行 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning, Grok 4 |

#### 機能

- 数値計算・データ分析
- グラフ・チャート生成（matplotlib, seaborn等）
- 統計処理
- シミュレーション実行
- ファイル入出力（一時的な作業領域）

#### 使用例

```typescript
const tools = [{ type: 'code_execution' }];
```

---

### 4. Collections Search (`collections_search`)

| 項目 | 内容 |
|------|------|
| **名前** | コレクション検索 / ファイル検索 |
| **API名** | `collections_search` |
| **説明** | アップロードしたドキュメント・ナレッジベースを検索 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning, Grok 4 |

#### 機能

- セマンティック検索（意味ベースの検索）
- PDF、テキスト、CSV、Markdownなど複数形式対応
- RAG（Retrieval-Augmented Generation）ワークフロー
- 社内文書・規約の参照

#### 使用例

```typescript
const tools = [{
  type: 'collections_search',
  collection_id: 'col_xxxxxxxx'  // 事前にアップロードしたコレクションID
}];
```

---

## ツールの組み合わせ

複数のツールを同時に指定可能：

```typescript
const tools = [
  { type: 'web_search' },
  { type: 'live_search' },
  { type: 'code_execution' }
];
```

AIはクエリに応じて最適なツールを自動選択、または複数のツールを組み合わせて使用します。

---

## SDK/API別のツール指定方法

### xAI SDK (Python)

```python
from xai_sdk import Client
from xai_sdk.tools import web_search, x_search, code_execution

client = Client(api_key=os.getenv("XAI_API_KEY"))
chat = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[
        web_search(),
        x_search(),           # SDKではまだ x_search の関数名
        code_execution(),
    ],
)
```

### OpenAI互換API (REST)

```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4-1-fast-reasoning",
    "messages": [
      {"role": "user", "content": "最新のAIニュースを教えて"}
    ],
    "tools": [
      {"type": "web_search"},
      {"type": "live_search"}
    ]
  }'
```

### Vercel AI SDK

```typescript
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

const result = await generateText({
  model: xai('grok-4-1-fast-reasoning'),
  tools: {
    web_search: xai.tools.webSearch(),
    x_search: xai.tools.xSearch(),  // Vercel SDKでは xSearch の関数名
  },
  prompt: '最新のAIニュースを教えて',
});
```

---

## レスポンスと引用

### ツール使用状況の確認

```typescript
// レスポンスの usage フィールド
{
  "usage": {
    "prompt_tokens": 6397,
    "completion_tokens": 834,
    "total_tokens": 7231,
    "num_sources_used": 0,
    "num_server_side_tools_used": 1,
    "server_side_tool_usage_details": {
      "web_search_calls": 1,
      "x_search_calls": 0,
      "code_interpreter_calls": 0,
      "file_search_calls": 0,
      "mcp_calls": 0,
      "document_search_calls": 0
    }
  }
}
```

### 引用 (Citations)

検索ツール使用時、レスポンスに情報源のURLが含まれます：

```typescript
// response.citations に引用情報
{
  "citations": [
    {"url": "https://example.com/article1"},
    {"url": "https://example.com/article2"}
  ]
}
```

---

## 価格

ツールリクエストの価格は以下の2要素で構成されます：

1. **トークン使用量**: 通常の入力/出力トークン料金
2. **ツール呼び出し**: ツール実行ごとの料金（1000回あたり最大$5）

詳細: [xAI Pricing](https://x.ai/pricing)

---

## 実装詳細

### GrokClient の実装

```typescript
// lib/llm/clients/grok.ts
private getTools(): unknown[] | undefined {
  const tools: unknown[] = [];
  
  if (this.toolOptions.enableWebSearch) {
    tools.push({ type: 'web_search' });
  }
  
  if (this.toolOptions.enableXSearch) {
    tools.push({ type: 'live_search' });  // x_search から変更
  }
  
  if (this.toolOptions.enableCodeExecution) {
    tools.push({ type: 'code_execution' });
  }
  
  if (this.toolOptions.enableFileSearch) {
    tools.push({ type: 'collections_search' });
  }
  
  return tools.length > 0 ? tools : undefined;
}
```

### 型定義

```typescript
// lib/settings/db.ts
export type GrokToolType = 
  | 'web_search' 
  | 'live_search'   // x_search から変更
  | 'code_execution' 
  | 'collections_search';
```

---

## トラブルシューティング

### エラー: `unknown variant 'x_search'`

**症状**:
```
422 Failed to deserialize the JSON body: 
tools[0].type: unknown variant `x_search`, expected `function` or `live_search`
```

**原因**: X検索ツールの名前が `x_search` から `live_search` に変更された

**解決策**: `type: 'live_search'` を使用

### エラー: `Live search is deprecated`

**症状**:
```
{'error': 'Live search is deprecated. Please switch to the Agent Tools API'}
```

**原因**: 旧Live Search API（`search_parameters`）を使用している

**解決策**: `tools` パラメータを使用するAgent Tools APIに移行

### エラー: `allowed_domains` と `excluded_domains` の同時使用

**症状**:
```
Cannot set both allowed_domains and excluded_domains
```

**解決策**: どちらか一方のみを指定

---

## 参考リンク

- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [Web Search Tool](https://docs.x.ai/developers/tools/web-search)
- [X Search Tool](https://docs.x.ai/developers/tools/x-search)
- [Code Execution Tool](https://docs.x.ai/developers/tools/code-execution)
- [Collections Search Tool](https://docs.x.ai/developers/tools/collections-search)
- [xAI Release Notes](https://docs.x.ai/developers/release-notes)
- [Vercel AI SDK - xAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
- [LangChain xAI Integration Issue](https://github.com/langchain-ai/langchain/issues/33961)
