# Grok Agent Tools API 仕様

> **優先度**: 🔴 高
> **状態**: 実装待ち
> **最終更新**: 2026-02-24 13:45
> **関連**: plans/xai-agent-tools-final.md

---

## 概要

xAIのAgent Tools APIは、Grokモデルにサーバーサイドで実行されるツールを提供します。これにより、AIは自律的にツールを使いこなし、Web検索、X検索、コード実行などを行うことができます。

> ⚠️ **重要**: 現在のLangChain実装では、Agent Toolsは**統合されていません**。`toolOptions`パラメータは受け取りますが、実際のAPIリクエストには含まれていません。

### ツールの種類

| 種類 | 説明 | 例 |
|------|------|-----|
| **組み込みツール (Built-in Tools)** | xAIのサーバーで自動実行されるサーバーサイドツール | Web Search, X Search, Code Execution |
| **関数呼び出し (Function Calling)** | 開発者が定義したカスタム関数 | データベースクエリ、API呼び出し、独自ビジネスロジック |

---

## 実装状況

### 現在の状態: ⚠️ 未統合

| 機能 | 状態 | 備考 |
|------|------|------|
| Web Search (`web_search`) | ❌ 未実装 | APIリクエストに含まれていない |
| X Search (`x_search`) | ❌ 未実装 | APIリクエストに含まれていない |
| Code Execution (`code_execution`) | ❌ 未実装 | APIリクエストに含まれていない |
| Collections Search | ❌ 未対応 | `vector_store_ids` が必要 |

### 技術的制約

LangChainの `ChatOpenAI` クライアントでは、xAIの組み込みツール（`web_search`, `x_search`等）を直接使用することができません。これらのツールを使用するには以下のアプローチが必要です：

1. **xAI Responses APIを直接呼び出す**（`fetch`等で生のHTTPリクエスト）
2. **LangChainのカスタムクライアントを実装する**
3. **Vercel AI SDK等、xAIツールをサポートするSDKを使用する**

---

## アーキテクチャ

### 現在の実装（LangChainベース）

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client (UI)   │────▶│  /api/llm/stream │────▶│ LangChain Chain │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
        │                                                 │
        │  toolOptions（未使用）                            │
        │                                                 ▼
        │                                    ┌──────────────────┐
        │                                    │ xAI API          │
        │                                    │ (/chat/completions│
        │                                    │  ツールなし)      │
        │                                    └──────────────────┘
        │
        ▼
┌─────────────────┐
│ 理想: Responses │
│  API + tools    │
│  (未実装)       │
└─────────────────┘
```

### 実装ファイル構成

| ファイル | 説明 | ツール関連の実装 |
|---------|------|----------------|
| `lib/llm/langchain/factory.ts` | LangChainモデル生成 | ❌ なし（単純なChatOpenAI） |
| `lib/llm/langchain/chains/streaming.ts` | ストリーミングChain | ❌ なし |
| `lib/llm/langchain/callbacks/streaming.ts` | コールバックハンドラー | ❌ ツールイベントは検出されない |
| `app/api/llm/stream/route.ts` | APIエンドポイント | ⚠️ `toolOptions`受け取るが無視 |

---

## ツール一覧（仕様）

### 1. Web Search (`web_search`)

| 項目 | 内容 |
|------|------|
| **名前** | Web検索 |
| **API名** | `web_search` |
| **説明** | インターネットからリアルタイムで最新情報を検索・閲覧 |
| **実装状態** | ❌ **未実装** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4 |

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `allowed_domains` | `string[]` | 任意 | 検索対象ドメインを限定（最大5つ）。`excluded_domains` と同時使用不可 |
| `excluded_domains` | `string[]` | 任意 | 除外ドメインを指定（最大5つ）。`allowed_domains` と同時使用不可 |

#### 使用例（理想）

```typescript
// xAI Responses API での使用例（現在は未実装）
const response = await fetch('https://api.x.ai/v1/responses', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'grok-4-1-fast-reasoning',
    input: [{ role: 'user', content: '最新のAIニュースを教えて' }],
    tools: [{ type: 'web_search' }]  // ← 現在は送信されていない
  }),
});
```

---

### 2. X Search (`x_search`)

| 項目 | 内容 |
|------|------|
| **名前** | X検索 |
| **API名** | `x_search` |
| **説明** | X（Twitter）からリアルタイム投稿、ユーザー、スレッドを検索 |
| **実装状態** | ❌ **未実装** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4 |

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `allowed_x_handles` | `string[]` | 任意 | 特定アカウントの投稿のみ検索（最大10つ） |
| `excluded_x_handles` | `string[]` | 任意 | 特定アカウントを除外（最大10つ） |
| `from_date` | `string` | 任意 | 検索開始日（ISO8601形式: `YYYY-MM-DD`） |
| `to_date` | `string` | 任意 | 検索終了日（ISO8601形式: `YYYY-MM-DD`） |

---

### 3. Code Execution (`code_execution`)

| 項目 | 内容 |
|------|------|
| **名前** | コード実行 |
| **API名** | `code_execution` |
| **説明** | Pythonコードを安全なサンドボックス環境で実行 |
| **実装状態** | ❌ **未実装** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4 |

#### 機能

- 数値計算・データ分析
- グラフ・チャート生成（matplotlib, seaborn等）
- 統計処理
- シミュレーション実行
- ファイル入出力（一時的な作業領域）

---

### 4. Collections Search (`collections_search`)

| 項目 | 内容 |
|------|------|
| **名前** | コレクション検索 / ファイル検索 |
| **API名** | `collections_search` |
| **説明** | アップロードしたドキュメント・ナレッジベースを検索 |
| **実装状態** | ❌ **未対応** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4 |

#### 制限事項

- `vector_store_ids` パラメータが必要
- ファイルアップロード機能が必要

---

## ツール設定（フロントエンドのみ）

### 機能別ツール設定

`lib/chat/chat-config.ts` で機能別のデフォルトツール設定を定義していますが、**実際のAPIリクエストには反映されていません**：

```typescript
export const featureToolDefaults: Record<ChatFeatureId, ToolOptions> = {
  "general-chat": { enableWebSearch: true },
  "research-cast": { enableWebSearch: true, enableXSearch: true },
  "research-location": { enableWebSearch: true },
  "research-info": { enableWebSearch: true, enableXSearch: true },
  "research-evidence": { enableWebSearch: true },
  "minutes": { enableWebSearch: false },
  "proposal": { enableWebSearch: true, enableXSearch: true },
  "na-script": { enableWebSearch: false },
};
```

### APIリクエストの流れ

```typescript
// app/api/llm/stream/route.ts
const {
  messages,
  toolOptions,  // ← 受け取るが...
} = validationResult.data;

// LangChainモデルの作成（toolOptionsは無視される）
const model = createLangChainModel(provider, {
  temperature,
  maxTokens,
  streaming: true,
  // toolOptions はここに含まれていない
});
```

---

## APIエンドポイント

### ストリーミングチャット

```
POST /api/llm/stream
```

#### リクエスト

```typescript
{
  "messages": [{"role": "user", "content": "..."}],
  "provider": "grok-4-1-fast-reasoning",  // オプション
  "temperature": 0.7,                      // オプション
  "maxTokens": 2000,                       // オプション
  "toolOptions": {                         // ⚠️ 受け取るが無視される
    "enableWebSearch": true
  }
}
```

> **注意**: `toolOptions` はスキーマで定義され受け取りますが、実際のAPIリクエストには含まれていません。

#### レスポンス（SSE）

```
data: {"accepted": true}
data: {"stepStart": {"step": 1, "id": "step-1-xxx", "title": "分析と計画", ...}}
data: {"content": "回答の一部..."}
data: {"usage": {"inputTokens": 100, "outputTokens": 50, "cost": 0}}
```

> **注意**: `toolCallEvent` は送信されません（ツールが実行されていないため）。

---

## LangChain統合

### 現在の実装

```typescript
// lib/llm/langchain/factory.ts
export function createLangChainModel(provider: LLMProvider, options: LangChainOptions = {}) {
  const config = getProviderConfig(provider);
  
  // ChatOpenAI を生成（ツールなし）
  return new ChatOpenAI({
    modelName: config.model,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens,
    streaming: options.streaming ?? false,
    apiKey: config.apiKey,
    configuration: { baseURL: config.baseUrl },
  });
}
```

### 必要な修正

ツールを統合するには、以下のいずれかのアプローチが必要です：

#### オプション1: xAI Responses APIを直接呼び出す

```typescript
// 新しいクライアントを実装
export async function* streamWithTools(
  messages: LLMMessage[],
  tools: GrokToolType[]
): AsyncIterable<StreamChunk> {
  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      input: messages,
      tools: tools.map(t => ({ type: t })),
      stream: true,
    }),
  });
  
  // SSEパース処理...
}
```

#### オプション2: LangChainでカスタムツールを定義

```typescript
// クライアントサイドツールとして定義（サーバーサイド実行ではない）
const tools = [
  new DynamicStructuredTool({
    name: 'web_search',
    description: 'Search the web',
    func: async ({ query }) => {
      // 実装...
    },
  }),
];

const modelWithTools = model.bindTools(tools);
```

---

## 重要な変更履歴

### 2026-02-24: LangChain移行完了（ツール未統合）

**変更内容**:
- 独自GrokClientを削除し、LangChainベースの実装に完全移行
- `@langchain/openai` の `ChatOpenAI` を使用（xAIはOpenAI互換API）
- **⚠️ Agent Toolsは未統合** - `toolOptions`は受け取るが無視される

**影響ファイル**:
- `lib/llm/factory.ts` - LangChainアダプターを使用
- `lib/llm/langchain/adapter.ts` - LLMClientインターフェース実装
- `lib/llm/langchain/factory.ts` - ChatOpenAI生成（ツールなし）
- `lib/llm/langchain/chains/streaming.ts` - ストリーミングChain
- `lib/llm/langchain/callbacks/streaming.ts` - イベントコールバック（ツールイベント検出不可）

**既知の問題**:
- `toolOptions` はAPIスキーマで定義されているが、実際のリクエストには含まれていない
- フロントエンドでツール有効化UIが表示されるが、実際にはツールが実行されない

### 2026-02-20: Responses APIへの移行（過去の実装）

**問題**: xAI APIで `x_search` ツールを使用すると以下のエラーが発生

```
xAI API error: 422 Failed to deserialize the JSON body into the target type: 
tools[0].type: unknown variant `x_search`, expected `function` or `live_search` 
at line 1 column 5457
```

**原因**: 
- `chat/completions` エンドポイントでは組み込みツールがサポートされていない
- 組み込みツールを使用するには **Responses API** (`/v1/responses`) を使用する必要がある

---

## 今後の対応

### 優先度: 高

1. **xAI Responses APIへの対応**
   - LangChainを使わず、生のHTTPリクエストで実装
   - または、LangChainのカスタムクライアントを実装

2. **ツール使用状況のUI表示**
   - 現状はツールイベントが送信されないため、UIにも表示されない
   - ツール統合後に `ToolCallIndicator` コンポーネントが機能するようになる

### 検討事項

| アプローチ | メリット | デメリット |
|-----------|---------|-----------|
| 生のHTTPリクエスト | xAIの全機能を直接使用可能 | LangChainの利便性が失われる |
| LangChainカスタムクライアント | LangChainのエコシステムを維持 | 実装コストが高い |
| Vercel AI SDK | xAIツールをネイティブサポート | 別フレームワークの導入 |

---

## 参考リンク

- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [Web Search Tool](https://docs.x.ai/developers/tools/web-search)
- [X Search Tool](https://docs.x.ai/developers/tools/x-search)
- [Code Execution Tool](https://docs.x.ai/developers/tools/code-execution)
- [xAI Release Notes](https://docs.x.ai/developers/release-notes)
- [LangChain Documentation](https://js.langchain.com/)
