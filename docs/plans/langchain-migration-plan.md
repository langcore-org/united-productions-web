# LangChain 移行状況レポート

> **Next.jsプロジェクトへのLangChain移行状況**
>
> **作成日**: 2026-02-21 19:30
> **更新日**: 2026-02-23 17:15
> **調査基準日**: 2026-02-23（LangChain JS v0.3.x）
> **状態**: ✅ **移行完了**

---

## 1. 移行状況サマリー

### 1.1 現在の状態: ✅ 移行完了

| フェーズ | 状態 | 完了日 | 内容 |
|---------|------|--------|------|
| Phase 0: 準備 | ✅ 完了 | 2026-02-21 | 技術検証、パッケージインストール |
| Phase 1: 基本機能 | ✅ 完了 | 2026-02-21 | 基本Chain、ストリーミングAPI実装 |
| Phase 2: 既存API移行 | ✅ 完了 | 2026-02-21 | API RoutesのLangChain化 |
| Phase 3: 高度機能 | ✅ 完了 | 2026-02-21 | ツール、Agent、RAG、メモリ管理 |
| Phase 4: レガシー削除 | ✅ 完了 | 2026-02-21 | 旧実装の削除、完全移行 |

### 1.2 インストール済みパッケージ

```json
{
  "@langchain/core": "^1.1.27",
  "@langchain/openai": "^1.2.9",
  "@langchain/anthropic": "^1.3.19",
  "@langchain/textsplitters": "^1.0.1",
  "langchain": "^1.2.25"
}
```

---

## 2. 実装済みコンポーネント

### 2.1 コア実装 (`lib/llm/langchain/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `config.ts` | プロバイダー設定、モデルマッピング | ✅ 実装済み |
| `types.ts` | LangChain用型定義、メッセージ変換関数 | ✅ 実装済み |
| `factory.ts` | プロバイダー別モデル生成（OpenAI互換、Anthropic対応） | ✅ 実装済み |
| `adapter.ts` | 既存LLMClientインターフェースとの互換性レイヤー | ✅ 実装済み |

### 2.2 Chain実装 (`lib/llm/langchain/chains/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `base.ts` | 基本チャットChain（RunnableSequence使用） | ✅ 実装済み |
| `streaming.ts` | ストリーミングChain、SSEレスポンス生成 | ✅ 実装済み |

### 2.3 コールバック (`lib/llm/langchain/callbacks/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `streaming.ts` | StreamingCallbackHandler - 思考ステップ・ツール呼び出しのイベント追跡 | ✅ 実装済み |

### 2.4 プロンプトテンプレート (`lib/llm/langchain/prompts/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `templates.ts` | 再利用可能なプロンプトテンプレート（基本チャット、会議録要約、議事録生成等） | ✅ 実装済み |

### 2.5 ツール (`lib/llm/langchain/tools/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `index.ts` | DynamicTool定義（calculator, current_time, word_count, web_search） | ✅ 実装済み |

### 2.6 Agent (`lib/llm/langchain/agents/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `index.ts` | シンプルなツール使用チェーン（Agentを使わずツール直接呼び出し） | ✅ 実装済み |

### 2.7 メモリ管理 (`lib/llm/langchain/memory/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `index.ts` | SimpleChatMemory - インメモリ会話履歴管理 | ✅ 実装済み |

### 2.8 RAG (`lib/llm/langchain/rag/`)

| ファイル | 用途 | 状態 |
|---------|------|------|
| `index.ts` | executeRAG - OpenAIEmbeddingsを使用した類似度検索 | ✅ 実装済み |
| `simple.ts` | executeSimpleRAG - 軽量RAG実装 | ✅ 実装済み |

---

## 3. API Routes実装状況

| エンドポイント | ファイル | 状態 | 機能 |
|--------------|---------|------|------|
| `POST /api/llm/chat` | `app/api/llm/chat/route.ts` | ✅ 実装済み | 非同期チャット完了 |
| `POST /api/llm/stream` | `app/api/llm/stream/route.ts` | ✅ 実装済み | SSEストリーミング |
| `POST /api/llm/rag` | `app/api/llm/rag/route.ts` | ✅ 実装済み | RAG検索・回答生成 |
| `POST /api/llm/usage` | `app/api/llm/usage/route.ts` | ✅ 既存 | 使用量追跡 |

---

## 4. 対応プロバイダー

| プロバイダー | モデル | 状態 | 備考 |
|------------|--------|------|------|
| xAI | `grok-4-1-fast-reasoning` | ✅ 使用中 | OpenAI互換API |
| xAI | `grok-4-0709` | ✅ 対応済み | OpenAI互換API |
| OpenAI | `gpt-4o-mini`, `gpt-5` | 📝 将来追加 | 設定のみ準備 |
| Anthropic | Claudeシリーズ | ✅ 対応済み | @langchain/anthropic使用 |
| Google | Geminiシリーズ | 📝 将来追加 | 別途パッケージ必要 |
| Perplexity | Sonarシリーズ | 📝 将来追加 | OpenAI互換API |

---

## 5. レガシーコード状況

### 5.1 削除済み

| 項目 | 状態 |
|------|------|
| `lib/llm/clients/` ディレクトリ | ✅ 削除済み |
| 独自のプロンプト構築ロジック | ✅ 削除済み |
| 手動のツール呼び出し管理 | ✅ 削除済み |
| 独自のRAG実装 | ✅ 削除済み |

### 5.2 保持中（互換性のため）

| 項目 | 状態 | 理由 |
|------|------|------|
| `lib/llm/types.ts` | ✅ 保持 | 既存インターフェース維持 |
| `lib/llm/factory.ts` | ✅ 保持 | createLLMClient関数の互換性 |
| `lib/llm/config.ts` | ✅ 保持 | プロバイダー設定 |

---

## 6. 技術的改善点

### 6.1 導入されたLangChain機能

| 機能 | 実装場所 | 効果 |
|------|---------|------|
| LCEL (LangChain Expression Language) | `chains/base.ts` | Chainの宣言的な構築 |
| RunnableSequence | `chains/base.ts` | パイプライン処理の標準化 |
| StringOutputParser | `chains/base.ts` | 出力パースの標準化 |
| BaseCallbackHandler | `callbacks/streaming.ts` | 実行過程のリアルタイム追跡 |
| DynamicTool | `tools/index.ts` | ツール定義の標準化 |
| ChatPromptTemplate | `prompts/templates.ts` | プロンプト管理の標準化 |
| OpenAIEmbeddings | `rag/index.ts` | エンベディング生成の標準化 |

### 6.2 ストリーミング機能

- **SSE形式**: `data: {...}\n\n` 形式でのイベント送信
- **イベントタイプ**:
  - `accepted`: リクエスト受理
  - `stepStart`: 思考ステップ開始
  - `stepUpdate`: 思考ステップ更新
  - `toolCallEvent`: ツール呼び出し状態変更
  - `chunk`: コンテンツチャンク
  - `usage`: 使用量情報
  - `done`: 完了

---

## 7. 今後の拡張予定

### 7.1 優先度: 高

| 項目 | 内容 | 想定工数 |
|------|------|---------|
| Vector Store統合 | Pinecone/Supabase等のVectorStore連携 | 1-2週間 |
| Document Loader | PDF、Webページ等の文書読み込み | 1週間 |
| 本格Agent | AgentExecutor、ReAct Agentの導入 | 1-2週間 |

### 7.2 優先度: 中

| 項目 | 内容 | 想定工数 |
|------|------|---------|
| LangSmith統合 | 実行トレース、コスト分析 | 3-5日 |
| メモリ永続化 | Redis/DBベースの会話履歴管理 | 3-5日 |
| 高度なRAG | ConversationSummaryMemory等 | 1週間 |

### 7.3 優先度: 低

| 項目 | 内容 | 想定工数 |
|------|------|---------|
| 追加プロバイダー | Google Gemini、Perplexity等 | 2-3日/プロバイダー |
| Vercel AI SDK併用 | シンプルなチャット用の併用検討 | 1週間 |

---

## 8. トラブルシューティング

### 8.1 既知の問題

| 問題 | 状況 | 対応 |
|------|------|------|
| usage情報の精度 | LangChainでは推定値のみ | モデル依存のため、必要に応じてCallbackで実装 |
| Google Gemini未対応 | @langchain/google-genai未インストール | 必要時にパッケージ追加 |

### 8.2 デバッグ方法

```typescript
// Callbacksによる追跡
import { ConsoleCallbackHandler } from '@langchain/core/tracers/console';

const model = new ChatOpenAI({
  callbacks: [new ConsoleCallbackHandler()],
});
```

---

## 9. 参考情報

### 9.1 公式ドキュメント
- [LangChain JS 公式ドキュメント](https://js.langchain.com/docs/introduction)
- [LangChain Core ドキュメント](https://api.js.langchain.com/modules/_langchain_core.html)
- [LCEL（LangChain Expression Language）](https://js.langchain.com/docs/expression_language/)

### 9.2 関連ドキュメント
- `docs/specs/api-integration/llm-integration-overview.md` - LLM統合仕様
- `lib/llm/langchain/` - 実装コード

### 9.3 主要実装ファイル一覧

```
lib/llm/
├── index.ts                    # 公開エクスポート
├── types.ts                    # 基本型定義
├── factory.ts                  # Factory（LangChain使用）
├── config.ts                   # プロバイダー設定
└── langchain/
    ├── config.ts               # LangChain設定
    ├── types.ts                # LangChain型定義
    ├── factory.ts              # モデル生成
    ├── adapter.ts              # 互換性アダプター
    ├── chains/
    │   ├── base.ts             # 基本Chain
    │   └── streaming.ts        # ストリーミングChain
    ├── callbacks/
    │   └── streaming.ts        # ストリーミングコールバック
    ├── prompts/
    │   └── templates.ts        # プロンプトテンプレート
    ├── tools/
    │   └── index.ts            # ツール定義
    ├── agents/
    │   └── index.ts            # Agent実装
    ├── memory/
    │   └── index.ts            # メモリ管理
    └── rag/
        ├── index.ts            # RAG実装
        └── simple.ts           # 簡易RAG

app/api/llm/
├── chat/route.ts               # チャットAPI
├── stream/route.ts             # ストリーミングAPI
└── rag/route.ts                # RAG API
```

---

## 10. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2026-02-21 | AI開発エージェント | 初版作成（計画書として作成） |
| 2026-02-21 | AI開発エージェント | Phase 1-4実装完了、移行完了 |
| 2026-02-23 | AI開発エージェント | 移行状況レポートとして全面改訂 |

---

## 11. 結論

**LangChainへの移行は完了しています。**

- 全てのLLM機能がLangChainベースで実装済み
- レガシーコードは削除済み
- 既存インターフェース（`LLMClient`等）は互換性レイヤーで維持
- 今後は高度機能（Vector Store、本格Agent、LangSmith等）の追加を検討
