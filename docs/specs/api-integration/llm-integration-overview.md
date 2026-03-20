# LLM統合概要

> **複数LLMプロバイダーを統一インターフェースで利用するための概要**
>
> **最終更新**: 2026-03-20 14:35

---

## ⚠️ 重要: 現在のプロバイダー方針

### 現状（2026-03-20）

| 項目 | 状態 |
|------|------|
| **現在のプロバイダー** | **xAI (Grok) のみ** |
| **実装方式** | **xAI直接API呼び出し**（LangChain不使用） |
| **理由** | xAI Agent Tools（web_search, x_search, code_execution）がResponses API専用のため |

### 将来方針

| タイミング | 予定 |
|------------|------|
| **当面** | xAI (Grok) のみ使用 |
| **将来（未定）** | Google Gemini 追加検討 |
| **その他** | OpenAI, Anthropic, Perplexity は現時点で予定なし |

### 技術的留意事項

- **LangChainは残存**: 将来のGemini追加に備え、`lib/llm/langchain/` は削除せず保持
- **Factoryパターン**: プロバイダー追加時は `lib/llm/factory.ts` で分岐処理を追加
- **xAI直接実装**: `lib/llm/clients/grok.ts`（復元予定）でxAIのみ直接呼び出し

---

## 概要

AI Hubは現在 **xAI (Grok) のみ** を使用。LangChainは将来のGemini追加に備えて保持しているが、現時点では直接使用していない。

xAI Agent Tools（web_search, x_search, code_execution）を使用するため、xAI Responses API（`/v1/responses`）を直接呼び出している。

### 使用フレームワーク

| フレームワーク | 用途 | パッケージ | 状態 |
|--------------|------|-----------|------|
| **xAI直接呼び出し** | LLM統合・Agent Tools | ネイティブfetch | ✅ 使用中 |
| **LangChain** | （将来のGemini追加用に保持） | `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, `@langchain/community` | 📦 保持（未使用） |

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
├── clients/
│   └── grok.ts           # xAI Grokクライアント（直接実装）
├── memory/               # ClientMemory実装
│   ├── client-memory.ts
│   ├── types.ts
│   └── index.ts
└── langchain/            # LangChain統合（将来用に保持）
    ├── types.ts          # LangChain用型定義
    ├── factory.ts        # LangChainクライアント生成
    ├── config.ts         # LangChain設定
    ├── adapter.ts        # アダプター
    ├── callbacks/        # コールバックハンドラー
    │   └── streaming.ts  # ストリーミング用コールバック
    └── chains/           # Chain定義
        ├── base.ts
        └── streaming.ts
```

---

## API Routes

| エンドポイント | 説明 |
|---|---|
| `/api/llm/chat` | 非同期チャットAPI |
| `/api/llm/stream` | ストリーミングチャットAPI（SSE） |
| `/api/llm/stream` | ストリーミングチャットAPI（SSE） |

---

## 対応モデル一覧

### 現在連携済み

| プロバイダー | モデル | 入力$/1M | 出力$/1M | コンテキスト | 主な用途 |
|---|---|---|---|---|---|
| xAI | Grok 4.1 Fast Reasoning | $0.20 | $0.50 | 2M | X検索、高速推論（デフォルト） |
| xAI | Grok 4.20 Multi-Agent | $2.00 | $6.00 | 2M | エビデンスリサーチ |

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

## 実装パターン

### xAI直接呼び出し（現在の実装）

Agentic AI機能を実現するため、**xAI Responses APIを直接呼び出し**しています。

```typescript
// lib/llm/clients/grok.ts
export class GrokClient implements LLMClient {
  async *stream(messages: LLMMessage[], options?: StreamOptions): AsyncIterable<LLMStreamChunk> {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.provider,
        input: messages,
        stream: true,
        tools: [{ type: "web_search" }, { type: "x_search" }, { type: "code_execution" }],
      }),
    });
    
    // SSEストリーミング処理
    for await (const event of this.parseSSE(response)) {
      yield this.transformToChunk(event);
    }
  }
}
```

### 対応機能

| 機能 | 説明 | 状態 |
|-----|------|------|
| Tool Calling | ツール呼び出し（web_search, x_search, code_execution） | ✅ 実装済み |
| Streaming | SSEストリーミング応答 | ✅ 実装済み |
| Citations | 引用情報の取得と表示 | ✅ 実装済み |
| ClientMemory | クライアントサイド会話履歴管理 | ✅ 実装済み |
| ReAct Agent | 推論と行動の連鎖 | ⏸️ 未使用（GrokのAgent機能で代替） |
| LangChain統合 | 将来のGemini追加用 | 📦 保持（未使用） |

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
- [langchain-usage-current.md](./langchain-usage-current.md) - LangChain使用状況の詳細
- `lib/llm/` - LLMクライアント実装
- `lib/llm/langchain/` - LangChain統合
- `hooks/use-llm.ts` - LLM通信フック（独自実装）
- `hooks/useLLMStream/` - ストリーミングフック（独自実装）
- `hooks/useLangChainChat.ts` - LangChainフック
- [external-services.md](./external-services.md) - 外部サービス連携

## 注意事項

### フレームワーク選定の経緯

#### Vercel AI SDK（アンインストール済み）
当初はVercel AI SDKの導入を検討しましたが、以下の理由から**使用せずアンインストール**しました：

1. **xAI Agent Toolsとの互換性**: xAIのAgent Tools（web_search, x_search, code_execution）はResponses API専用
2. **カスタマイズ性**: 自作のSSEパーサー（`lib/llm/sse-parser.ts`）でより細かな制御が可能
3. **パッケージサイズ**: 必要最小限の実装を維持

#### LangChain（保持だが未使用）
現在は使用していませんが、**将来のGemini追加に備えて保持**しています：

1. **将来の拡張性**: Google Gemini追加時にLangChain経由で統合可能に
2. **過去の投資**: 実装済みのLangChainコードを完全削除せず、再利用可能に
3. **切り替え容易性**: 必要時に `lib/llm/factory.ts` でプロバイダー分岐を追加

**現在の構成**:
- LLM統合: **xAI直接呼び出し**
- ストリーミング: **独自実装（SSEパーサー）**
- UIフック: **自作フック（`useLLM`, `useLLMStream`）**
- LangChain: **保持（将来のGemini用）**

**アンインストール済みパッケージ**:
```bash
npm uninstall ai @ai-sdk/react
```

### なぜLangChainを使用しないのか

| 理由 | 詳細 |
|------|------|
| **Agent Tools** | xAIのAgent ToolsはResponses API専用で、LangChain経由では使用不可 |
| **Citations** | xAIのcitations機能は直接API呼び出しで最適化 |
| **シンプルさ** | 直接実装の方がコードフローが明確で保守しやすい |
| **パフォーマンス** | ミドルウェアレイヤーを挟まない分、オーバーヘッドが少ない |
