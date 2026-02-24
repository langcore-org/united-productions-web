# LangChain 使用状況（現在）

> **現在のコードベースにおけるLangChainの使用状況**
>
> **最終更新**: 2026-02-23 22:00

---

## 概要

AI Hubプロジェクトでは、LLM統合の中核として**LangChain**を使用しています。

- **主要フレームワーク**: LangChain (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`)
- **使用パターン**: モデル生成、Chain実行、ストリーミング、プロンプトテンプレート、ツール定義
- **未使用機能**: RAG（削除済み）、VectorStore、TextSplitter、高度なMemory

---

## ファイル構成

```
lib/llm/langchain/
├── adapter.ts              # LLMClientインターフェース適合アダプター
├── agents/
│   └── index.ts            # 簡易ツール実行（シンプル実装）
├── callbacks/
│   └── streaming.ts        # ストリーミング用コールバックハンドラー
├── chains/
│   ├── base.ts             # 基本Chain（RunnableSequence使用）
│   └── streaming.ts        # ストリーミングChain実装
├── config.ts               # プロバイダー別設定
├── factory.ts              # LangChainモデル生成ファクトリー
├── memory/
│   └── index.ts            # シンプルなインメモリ会話履歴（自前実装）
├── prompts/
│   └── templates.ts        # プロンプトテンプレート定義
├── tools/
│   └── index.ts            # DynamicTool定義
└── types.ts                # LangChain用型定義・メッセージ変換
```

---

## LangChain使用箇所一覧

### ✅ 積極的に使用している機能

| 機能 | 使用ファイル | 使用内容 |
|-----|------------|---------|
| **Chat Models** | `factory.ts` | `ChatOpenAI`, `ChatAnthropic` |
| **RunnableSequence** | `chains/base.ts` | `RunnableSequence.from([...])` |
| **Output Parser** | `chains/base.ts` | `StringOutputParser` |
| **Prompt Templates** | `prompts/templates.ts` | `ChatPromptTemplate`, `SystemMessagePromptTemplate`, `HumanMessagePromptTemplate` |
| **Tools** | `tools/index.ts` | `DynamicTool` |
| **Callbacks** | `callbacks/streaming.ts` | `BaseCallbackHandler` |
| **Messages** | `types.ts` | `HumanMessage`, `AIMessage`, `SystemMessage` |

### 🔧 部分的に使用している機能

| 機能 | 使用ファイル | 使用内容 | 備考 |
|-----|------------|---------|------|
| **Embeddings** | （削除済み） | `OpenAIEmbeddings` | RAG削除に伴い未使用 |

### ❌ 使用していない機能（削除済みを含む）

| 機能 | 状態 | 理由 |
|-----|------|------|
| **VectorStore** | 未使用 | Grokの長いコンテキストで代替 |
| **TextSplitter** | 削除済み | `simpleTextSplit`は自前実装だったが削除 |
| **RAG** | 削除済み | `/api/llm/rag`エンドポイント未使用のため削除 |
| **ReAct Agent** | 未使用 | `createReactAgent`未導入 |
| **Memory** | 自前実装 | `BufferMemory`等は使用せず`SimpleChatMemory`を自前実装 |

---

## 詳細な使用パターン

### 1. モデル生成 (`factory.ts`)

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export function createLangChainModel(provider: LLMProvider, options?: LangChainOptions): BaseChatModel {
  switch (config.provider) {
    case 'openai':
    case 'xai':
    case 'perplexity':
      return new ChatOpenAI({...});
    case 'anthropic':
      return new ChatAnthropic({...});
  }
}
```

**使用パッケージ**:
- `@langchain/openai`
- `@langchain/anthropic`

### 2. Chain実行 (`chains/base.ts`)

```typescript
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export function createChatChain(model: BaseChatModel) {
  return RunnableSequence.from([
    (input: { messages: LLMMessage[] }) => toLangChainMessages(input.messages),
    model,
    new StringOutputParser(),
  ]);
}
```

**使用パッケージ**:
- `@langchain/core/runnables`
- `@langchain/core/output_parsers`

### 3. ストリーミング (`chains/streaming.ts`)

```typescript
const stream = await model.stream(langChainMessages, {
  callbacks: [callbackHandler],
});
```

**特徴**:
- LangChainの`model.stream()`を使用
- 独自の`StreamingCallbackHandler`でイベント処理

### 4. プロンプトテンプレート (`prompts/templates.ts`)

```typescript
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

export const basicChatPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate('...'),
  HumanMessagePromptTemplate.fromTemplate('{input}'),
]);
```

**使用パッケージ**:
- `@langchain/core/prompts`

### 5. ツール定義 (`tools/index.ts`)

```typescript
import { DynamicTool } from '@langchain/core/tools';

export const calculatorTool = new DynamicTool({
  name: 'calculator',
  description: 'Perform mathematical calculations',
  func: async (input: string) => { ... },
});
```

**使用パッケージ**:
- `@langchain/core/tools`

### 6. コールバック (`callbacks/streaming.ts`)

```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

export class StreamingCallbackHandler extends BaseCallbackHandler {
  name = 'streaming_callback_handler';
  
  async handleLLMStart(llm: unknown, prompts: string[], runId: string) { ... }
  async handleLLMNewToken(token: string, idx: unknown, runId: string) { ... }
  async handleToolStart(tool: unknown, input: string, runId: string) { ... }
}
```

**使用パッケージ**:
- `@langchain/core/callbacks/base`

### 7. メッセージ変換 (`types.ts`)

```typescript
import type { BaseMessage } from '@langchain/core/messages';

export function toLangChainMessages(messages: LLMMessage[]): BaseMessage[] {
  const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
  return messages.map(msg => {
    switch (msg.role) {
      case 'user': return new HumanMessage(msg.content);
      case 'assistant': return new AIMessage(msg.content);
      case 'system': return new SystemMessage(msg.content);
    }
  });
}
```

**使用パッケージ**:
- `@langchain/core/messages`

---

## 自前実装部分

LangChainを使用せず、自前で実装している機能:

| 機能 | ファイル | 理由 |
|-----|---------|------|
| **SSEパーサー** | `lib/llm/sse-parser.ts` | LangChainはクライアント側SSEパースを提供しない |
| **メモリ管理** | `lib/llm/langchain/memory/index.ts` | `SimpleChatMemory`を自前実装（シンプルな要件のため） |
| **Agent実行** | `lib/llm/langchain/agents/index.ts` | `createReactAgent`未導入、簡易ツール呼び出しのみ |
| **Reactフック** | `hooks/use-llm.ts`, `hooks/useLangChainChat.ts` | アプリケーション固有のため |

---

## 削除した機能（2026-02-23）

| ファイル | 削除理由 |
|---------|---------|
| `lib/llm/langchain/rag/index.ts` | 未使用（フロントエンドから呼び出しなし） |
| `lib/llm/langchain/rag/simple.ts` | 上記と重複 |
| `app/api/llm/rag/route.ts` | 未使用APIエンドポイント |
| `components/chat/AgenticResponse.tsx` | `StreamingSteps.tsx`で代替 |
| `components/chat/ProcessingFlow.tsx` | `StreamingSteps.tsx`で代替 |
| `components/chat/ReasoningSteps.tsx` | `StreamingSteps.tsx`で代替 |
| `components/chat/ToolCallIndicator.tsx` | `StreamingSteps.tsx`で代替 |
| `components/chat/ChatMessage.tsx` | 未使用 |
| `components/chat/EmptyState.tsx` | `components/ui/EmptyState.tsx`を直接使用 |
| `components/ui/StreamingMessage.tsx` | `StreamingSteps.tsx`で代替 |

**削除背景**:
- RAG機能は実装されていたが、フロントエンドから呼び出されていなかった
- Grokの2Mコンテキストとツール機能（collections_search）で代替可能
- 自前のTextSplitter、VectorStore（コサイン類似度実装）も未使用のため削除
- チャットコンポーネントは`StreamingSteps.tsx`に統合

---

## パッケージ一覧

### インストール済み

```json
{
  "dependencies": {
    "langchain": "^x.x.x",
    "@langchain/core": "^x.x.x",
    "@langchain/openai": "^x.x.x",
    "@langchain/anthropic": "^x.x.x",
    "@langchain/community": "^x.x.x"
  }
}
```

### アンインストール済み（過去に検討したが未使用）

- `ai` (Vercel AI SDK)
- `@ai-sdk/react`

---

## 網羅的な機能リスト

### lib/llm/ 以下の全ファイルとLangChain使用状況

| ファイル | LangChain使用 | 自前実装 | 説明 |
|---------|--------------|---------|------|
| `types.ts` | ❌ | ✅ 型定義 | `VALID_PROVIDERS`, `LLMMessage`, `LLMResponse`等 |
| `config.ts` | ❌ | ✅ 設定定数 | `PROVIDER_CONFIG`, `RATE_LIMITS`, `DEFAULT_PROVIDER` |
| `constants.ts` | ❌ | ✅ 定数 | `PROVIDER_LABELS`, `PROVIDER_COLORS` |
| `factory.ts` | ❌ | ✅ ファクトリー | `createLLMClient`（LangChain版をラップ） |
| `utils.ts` | ❌ | ✅ ユーティリティ | `resolveProvider`, `isGrokProvider` |
| `cache.ts` | ❌ | ✅ キャッシュ | RedisベースLLMレスポンスキャッシュ |
| `errors.ts` | ❌ | ✅ エラークラス | `LLMError`, `handleLLMError` |
| `sse-parser.ts` | ❌ | ✅ SSEパーサー | `parseSSEStream`（サーバーサイドSSEパース） |
| `index.ts` | ❌ | ✅ エクスポート | 公開APIのエクスポート |
| `langchain/types.ts` | ✅ 型のみ | ✅ メッセージ変換 | `toLangChainMessages`, `fromLangChainMessages` |
| `langchain/config.ts` | ❌ | ✅ 設定 | `PROVIDER_MODEL_MAP`, `getProviderConfig` |
| `langchain/factory.ts` | ✅ `ChatOpenAI`, `ChatAnthropic` | ✅ ファクトリー | `createLangChainModel`, `createStreamingModel` |
| `langchain/adapter.ts` | ✅ `BaseChatModel`（型） | ✅ アダプター | `LangChainClientAdapter` |
| `langchain/chains/base.ts` | ✅ `RunnableSequence`, `StringOutputParser` | ✅ Chainラッパー | `createChatChain`, `executeChat` |
| `langchain/chains/streaming.ts` | ✅ `BaseChatModel`（型）, `model.stream()` | ✅ ストリーミング実装 | `executeStreamingChat`, `createSSEStream` |
| `langchain/callbacks/streaming.ts` | ✅ `BaseCallbackHandler` | ✅ コールバック実装 | `StreamingCallbackHandler` |
| `langchain/prompts/templates.ts` | ✅ `ChatPromptTemplate`, `SystemMessagePromptTemplate`, `HumanMessagePromptTemplate` | ✅ テンプレート定義 | `basicChatPrompt`, `meetingSummaryPrompt`等 |
| `langchain/tools/index.ts` | ✅ `DynamicTool` | ✅ ツール定義 | `calculatorTool`, `currentTimeTool`等 |
| `langchain/agents/index.ts` | ✅ `BaseChatModel`, `DynamicTool`（型） | ✅ 簡易Agent実装 | `executeWithTools`, `executeWithDefaultTools` |
| `langchain/memory/index.ts` | ❌ | ✅ メモリ実装 | `SimpleChatMemory`, `createChatMemory`等 |

### 使用しているLangChainパッケージの機能一覧

#### `@langchain/core`
| 機能 | 使用ファイル | 用途 |
|-----|------------|------|
| `BaseChatModel` (型) | `factory.ts`, `chains/*.ts`, `agents/index.ts` | モデルの型定義 |
| `BaseMessage` (型) | `types.ts` | メッセージの型定義 |
| `RunnableSequence` | `chains/base.ts` | Chainの構成 |
| `StringOutputParser` | `chains/base.ts` | 出力パース |
| `ChatPromptTemplate` | `prompts/templates.ts` | プロンプトテンプレート |
| `SystemMessagePromptTemplate` | `prompts/templates.ts` | システムメッセージテンプレート |
| `HumanMessagePromptTemplate` | `prompts/templates.ts` | ユーザーメッセージテンプレート |
| `DynamicTool` | `tools/index.ts`, `agents/index.ts` | ツール定義 |
| `BaseCallbackHandler` | `callbacks/streaming.ts` | ストリーミングコールバック |
| `HumanMessage`, `AIMessage`, `SystemMessage` | `types.ts` | メッセージ変換 |

#### `@langchain/openai`
| 機能 | 使用ファイル | 用途 |
|-----|------------|------|
| `ChatOpenAI` | `factory.ts` | OpenAI互換API（xAI, Perplexity含む） |

#### `@langchain/anthropic`
| 機能 | 使用ファイル | 用途 |
|-----|------------|------|
| `ChatAnthropic` | `factory.ts` | Claude API |

### 自前実装の詳細一覧

| 機能 | ファイル | 実装内容 | LangChain未使用の理由 |
|-----|---------|---------|---------------------|
| **SSEパーサー** | `sse-parser.ts` | `parseSSEStream` - ReadableStreamをSSEイベントにパース | LangChainはクライアント側SSEパースを提供しない |
| **キャッシュ** | `cache.ts` | RedisベースのLLMレスポンスキャッシュ | アプリケーション固有の要件（TTL、プロバイダー別等） |
| **エラーハンドリング** | `errors.ts` | `LLMError`クラス、プロバイダー別エラー変換 | 統一されたエラー形式が必要 |
| **メモリ管理** | `memory/index.ts` | `SimpleChatMemory`クラス | 要件がシンプル（インメモリのみ） |
| **Agent実行** | `agents/index.ts` | `executeWithTools` - 簡易ツール呼び出し | `createReactAgent`は過剰機能のため |
| **ストリーミング** | `chains/streaming.ts` | `executeStreamingChat`, `createSSEStream` | SSE形式の細かい制御が必要 |
| **プロバイダー管理** | `factory.ts`, `config.ts`, `utils.ts` | プロバイダー設定、検証、選択ロジック | アプリケーション固有のマッピングが必要 |

---

## 未使用コードの検討（agents, memory）

### 概要

以下のファイルは現状未使用のため、**削除済み**です：

| ファイル | 行数 | 主要機能 | 状態 |
|---------|------|---------|------|
| `lib/llm/langchain/agents/index.ts` | 75行 | `executeWithTools`, `executeWithDefaultTools` | **削除済み** (2026-02-23) |
| `lib/llm/langchain/memory/index.ts` | 112行 | `SimpleChatMemory`, `executeWithMemory` | **削除済み** (2026-02-23) |

**削除理由:**
- 現状の実装（Prisma永続化 + Grokツール）で要件を満たしている
- 未使用コードは技術的負債となり、将来の開発者を混乱させる
- 必要になった場合はLangChain標準機能（`BufferMemory`, `createReactAgent`等）を使用すべき

**巻き戻し方法:**
```bash
# Git履歴から復元
git show HEAD~1:lib/llm/langchain/agents/index.ts > lib/llm/langchain/agents/index.ts
git show HEAD~1:lib/llm/langchain/memory/index.ts > lib/llm/langchain/memory/index.ts
```

### 削除前の検討内容（参考）

#### 1. Memory（`lib/llm/langchain/memory/index.ts`）

**活用シナリオ: インメモリキャッシュ層**

```typescript
// 例: APIルートで会話履歴のキャッシュに使用
import { SimpleChatMemory } from '@/lib/llm/langchain/memory';

// セッションごとのインメモリキャッシュ（Redis導入前の暫定策）
const sessionMemoryCache = new Map<string, SimpleChatMemory>();

export async function POST(request: NextRequest) {
  const sessionId = getSessionId(request);
  
  // キャッシュから取得 or 新規作成
  let memory = sessionMemoryCache.get(sessionId);
  if (!memory) {
    memory = createChatMemory({ maxMessages: 20 });
    sessionMemoryCache.set(sessionId, memory);
  }
  
  // 直近N件のみを使用してLLM呼び出し
  const recentMessages = await memory.getMessages();
  const response = await llm.chat(recentMessages);
}
```

**メリット:**
- DBアクセスを減らし、レスポンス時間を短縮（キャッシュヒット時）
- サーバー再起動までの間、同じセッション内での連続リクエストを最適化
- Redis導入前の軽量な暫定策として機能

**デメリット:**
- サーバー再起動でキャッシュが消失（永続性なし）
- 複数サーバー構成ではキャッシュを共有できない
- メモリ使用量が増加（セッション数に比例）
- 現状のPrisma永続化 + 全履歴送信で要件を満たしているため、追加価値が限定的

#### 2. Agents（`lib/llm/langchain/agents/index.ts`）

**活用シナリオ: カスタムツール連携**

```typescript
// 例: Grokツールではなく、自前のツール実行チェーンを使用
import { executeWithTools } from '@/lib/llm/langchain/agents';
import { calculatorTool, currentTimeTool } from '@/lib/llm/langchain/tools';

// 特定のツールのみを強制実行
const customTools = [calculatorTool, currentTimeTool];
const response = await executeWithTools(
  model,
  customTools,
  "100円の商品を3つ買ったら？"
);
```

**メリット:**
- Grokツールではなく、自前のツールロジックを使用可能
- ツールの組み合わせを細かく制御可能
- 特定のツールのみを強制実行したい場合に有効

**デメリット:**
- 現状のGrokツール連携（`web_search`, `x_search`等）と機能が重複
- 複数回のLLM呼び出しが必要（ツール選択 → 実行 → 最終回答生成）
- レイテンシが増大（最低2回のLLM呼び出し）
- Grokのネイティブツール機能の方が高速・安定

### 削除の判断基準

| 基準 | 評価 |
|-----|------|
| **YAGNI原則** | 現状では使用しておらず、明確な使用予定もない |
| **重複機能** | 現状の実装（Prisma永続化 + Grokツール）で要件を満たしている |
| **技術的負債** | 未使用コードは将来の開発者を混乱させる可能性 |
| **再実装の容易さ** | 必要になった時にLangChain標準機能を使用すべき |

### 削除により得られる効果

| 項目 | 効果 |
|-----|------|
| **コード量** | -187行削減 |
| **複雑性** | 単一の実装パターンに統一 |
| **可読性** | 実際に使用されているコードのみが残る |
| **テスト負担** | 不要なテストを削除可能 |

### 巻き戻し方法（削除後に必要になった場合）

```bash
# Git履歴から復元
git show HEAD~1:lib/llm/langchain/agents/index.ts > lib/llm/langchain/agents/index.ts
git show HEAD~1:lib/llm/langchain/memory/index.ts > lib/llm/langchain/memory/index.ts
```

または、LangChain標準機能を使用して再実装（推奨）:

```typescript
// Memoryが必要になった場合
import { BufferMemory } from 'langchain/memory';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';

const memory = new BufferMemory({
  chatHistory: new UpstashRedisChatMessageHistory({
    sessionId,
    config: { url: process.env.UPSTASH_REDIS_REST_URL, token: ... }
  })
});

// Agentが必要になった場合
import { createReactAgent } from '@langchain/langgraph/prebuilt';
const agent = createReactAgent({ llm: model, tools });
```

---

## コンポーネント統合（2026-02-23）

### 削除したコンポーネント

| コンポーネント | 機能 | 統合先 |
|-------------|------|--------|
| `AgenticResponse.tsx` | エージェント応答表示 | `StreamingSteps.tsx` |
| `ProcessingFlow.tsx` | 処理フロー表示 | `StreamingSteps.tsx` |
| `ReasoningSteps.tsx` | 思考ステップ表示 | `StreamingSteps.tsx` |
| `ToolCallIndicator.tsx` | ツール呼び出し表示 | `StreamingSteps.tsx` |
| `ChatMessage.tsx` | チャットメッセージ | 未使用のため削除 |
| `EmptyState.tsx` | 空状態表示 | `components/ui/EmptyState.tsx`を直接使用 |
| `StreamingMessage.tsx` | ストリーミングメッセージ | `StreamingSteps.tsx` |

### 新規作成したコンポーネント

| コンポーネント | 機能 | 元の実装 |
|-------------|------|---------|
| `ToolUsageSummary.tsx` | ツール使用回数サマリー | `AgenticResponse.tsx`から移植 |
| `ErrorMessage.tsx` | エラーメッセージ表示 | `AgenticResponse.tsx`から移植 |

### 統合後のアーキテクチャ

```
FeatureChat.tsx
└── StreamingSteps.tsx
    ├── ThinkingPlaceholderMessage
    ├── ToolCallMessage
    ├── NewThinkingStepMessage
    ├── ThinkingStepMessage（レガシー）
    ├── LegacyThinkingMessage
    ├── ErrorMessage（新規）
    └── ContentMessage
        └── ToolUsageSummary（新規）
```

---

## 今後の検討事項

| 機能 | 優先度 | 検討内容 |
|-----|--------|---------|
| **@langchain/textsplitters** | 低 | 必要に応じて導入（現状は不要） |
| **VectorStore** | 低 | Pinecone/Supabase等（現状はGrokで代替） |
| **createReactAgent** | 低 | 本格的なReActパターン（現状は簡易実装で十分） |
| **BufferMemory** | 低 | Redis永続化が必要になった場合 |

---

## 関連ドキュメント

- [llm-integration-overview.md](./llm-integration-overview.md) - LLM統合概要
- [llm-integration-patterns.md](./llm-integration-patterns.md) - 詳細実装パターン
- [streaming-events.md](./streaming-events.md) - ストリーミングイベント仕様
- `lib/llm/` - LLMクライアント実装
- `hooks/use-llm.ts` - LLM通信フック
