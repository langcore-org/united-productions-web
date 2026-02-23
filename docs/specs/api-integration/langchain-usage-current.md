# LangChain 使用状況（現在）

> **現在のコードベースにおけるLangChainの使用状況**
>
> **最終更新**: 2026-02-23 23:05

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

**削除背景**:
- RAG機能は実装されていたが、フロントエンドから呼び出されていなかった
- Grokの2Mコンテキストとツール機能（collections_search）で代替可能
- 自前のTextSplitter、VectorStore（コサイン類似度実装）も未使用のため削除

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
- `lib/llm/` - LLMクライアント実装
- `hooks/use-llm.ts` - LLM通信フック
