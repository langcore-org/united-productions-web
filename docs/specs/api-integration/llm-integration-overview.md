# LLM統合概要

> **複数LLMプロバイダーを統一インターフェースで利用するための概要**
>
> **最終更新**: 2026-02-22 11:16

---

## 概要

AI Hubは複数のLLMプロバイダーを統一インターフェースで利用可能。**LangChain**を使用してAgentic AI機能を実装しています。

### 使用フレームワーク

| フレームワーク | 用途 | パッケージ |
|--------------|------|-----------|
| **LangChain** | LLM統合・Agent実装 | `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/community`, `@langchain/textsplitters` |

---

## 実装ファイル構成

```
lib/llm/
├── types.ts              # LLM共通型定義
├── factory.ts            # LLMClient生成ファクトリ
├── cache.ts              # レスポンスキャッシュ（Upstash Redis）
├── config.ts             # プロバイダー設定（価格、レート制限）
├── utils.ts              # ユーティリティ関数
├── sse-parser.ts         # SSEレスポンスパーサー
├── index.ts              # 公開APIエクスポート
└── langchain/            # LangChain統合
    ├── types.ts          # LangChain用型定義
    ├── factory.ts        # LangChainクライアント生成
    ├── config.ts         # LangChain設定
    ├── adapter.ts        # アダプター
    ├── agents/           # Agent実装
    ├── chains/           # Chain定義
    │   ├── base.ts
    │   └── streaming.ts
    ├── memory/           # メモリ管理
    ├── prompts/          # プロンプトテンプレート
    ├── rag/              # RAG実装
    └── tools/            # ツール定義
```

---

## API Routes

| エンドポイント | 説明 |
|---|---|
| `/api/llm/chat` | 非同期チャットAPI |
| `/api/llm/stream` | ストリーミングチャットAPI（SSE） |
| `/api/llm/langchain/chat` | LangChain統合チャット |
| `/api/llm/rag/query` | RAG検索クエリ |

---

## 対応モデル一覧

### 現在連携済み

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
| xAI | Grok 4.1 Fast Reasoning | $0.20 | $0.50 | 2M | X検索、高速推論 |
| xAI | Grok 4 | $3.00 | $15.00 | 256K | 高品質推論 |

### 将来連携予定

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
| Google | Gemini 2.5 Flash-Lite | $0.075 | $0.30 | 1M | コスパ重視 |
| Google | Gemini 3.0 Flash | $0.50 | $3.00 | 1M | 高品質 |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 | 128K | コスパ |
| OpenAI | GPT-5 | $1.25 | $10.00 | 400K | フラッグシップ |
| Anthropic | Claude 4.5 Sonnet | $3.00 | $15.00 | 200K | バランス |
| Anthropic | Claude Opus 4.6 | $5.00 | $25.00 | 200K+ | 最高品質 |
| Perplexity | Sonar | $1.00 | $1.00 | 128K | エビデンス検索 |

---

## LangChain統合

### 概要

Agentic AI機能を実現するため、**LangChain**を統合しています。

```typescript
// lib/llm/langchain/factory.ts
export function createLangChainClient(config: LangChainConfig) {
  const model = createChatModel(config.provider);
  const tools = createTools(config.enabledTools);
  const memory = createMemory(config.sessionId);
  
  return AgentExecutor.fromAgentAndTools({
    agent: createReactAgent({ llm: model, tools }),
    tools,
    memory,
  });
}
```

### 対応機能

| 機能 | 説明 | 状態 |
|-----|------|------|
| ReAct Agent | 推論と行動の連鎖 | ✅ 実装済み |
| Tool Calling | ツール呼び出し | ✅ 実装済み |
| Memory | 会話履歴管理 | ✅ 実装済み |
| RAG | 文書検索 | ✅ 実装済み |
| Streaming | ストリーミング応答 | ✅ 実装済み |

---

## 環境変数

```bash
# 連携済み（必須）
XAI_API_KEY=            # xAI（$25無料クレジット）

# 将来連携予定（オプション）
# GEMINI_API_KEY=       # Google AI Studio無料枠
# PERPLEXITY_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

---

## 関連ドキュメント

- [llm-integration-patterns.md](./llm-integration-patterns.md) - 詳細実装パターン
- [llm-framework-comparison.md](./llm-framework-comparison.md) - フレームワーク選定経緯
- `lib/llm/` - LLMクライアント実装
- `lib/llm/langchain/` - LangChain統合
- `hooks/use-llm.ts` - LLM通信フック
- `hooks/useLangChainChat.ts` - LangChainフック
- [external-services.md](./external-services.md) - 外部サービス連携
