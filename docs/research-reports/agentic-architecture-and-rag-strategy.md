# エージェンティック・アーキテクチャ & RAG戦略リサーチレポート

> 作成日: 2026-03-20
> **更新日: 2026-03-20**（技術検証・情報拡充済み・xAI API調査完了）
> ステータス: **調査完了・継続的更新中**
> 対象: Teddy (TV番組制作支援AIアシスタント)
> 
> **調査方法**: Web検索（xAI API `web_search`）+ X検索（`x_search`）によるリアルタイム情報収集

---

## 目次

1. [現在の実装分析](#1-現在の実装分析)
2. [エージェンティック化の選択肢](#2-エージェンティック化の選択肢)
3. [RAGアーキテクチャ設計](#3-ragアーキテクチャ設計)
4. [コスト分析と最適化戦略](#4-コスト分析と最適化戦略)
5. [推奨アーキテクチャ](#5-推奨アーキテクチャ)
6. [実装ロードマップ](#6-実装ロードマップ)

---

## 0. プロジェクト内の関連ドキュメントと経緯

### 0.1 フレームワーク選定の歴史

本プロジェクトではLLMフレームワークの選定で以下の経緯がある：

| 時期 | 出来事 | 結果 |
|------|--------|------|
| 2026-02-21 | LangChain単独採用を決定 | xAI Agent Toolsが`/v1/responses`専用でLangChain非対応と判明 |
| 2026-02-23 | LangChain撤退、Vercel AI SDK(`ai`, `@ai-sdk/react`)をアンインストール | 直接xAI API実装に回帰 |
| 2026-02-24 | Vercel AI SDK + xAIの技術評価を実施 | **全機能正常動作**を確認、移行推奨 |
| 2026-03-20 | 本レポート作成 | エージェンティック化 + RAG構築の方針策定 |

**教訓**: 「標準化のための抽象化」は、複数の具体例が存在してから行う（YAGNI原則）

### 0.2 関連ドキュメント一覧

| ドキュメント | 内容 | 本レポートとの関係 |
|-------------|------|-------------------|
| [Vercel AI SDK xAI評価レポート](./vercel-ai-sdk-xai-evaluation.md) | `@ai-sdk/xai` v3.0.57の全機能検証結果 | **選択肢Cの技術的根拠** |
| [Vercel AI SDK PoCスニペット](./vercel-ai-sdk-poc-snippets.md) | 実装パターン集（Route Handler、React Hook、イベントハンドリング等） | Phase 2実装時の参考コード |
| [LangChain過早な抽象化の失敗](../lessons/2026-02-24-langchain-premature-abstraction.md) | LangChain導入→3日後撤退の教訓 | **選択肢A評価の根拠** |
| [LLMフレームワーク比較](../lessons/2026-02-21-llm-framework-comparison.md) | Vercel AI SDK vs LangChain の詳細比較 | フレームワーク選定の前提知識 |
| [フレームワーク・ツール導入検討書](../lessons/2026-02-23-framework-evaluation.md) | Biome/Lefthook等の導入実績、AI SDKアンインストール記録 | 現在のツールチェーン状態の把握 |
| [Vercel AI SDK導入計画書](../archive/vercel-ai-sdk-migration-plan.md) | 段階的移行戦略の詳細計画（アーカイブ） | Phase 2移行時に再利用可能な計画書 |

### 0.3 前回評価からの状況変化（2026-02-24 → 2026-03-20）

| 項目 | 前回（2月） | 現在（3月） | 影響 |
|------|-----------|-----------|------|
| Vercel AI SDK | v6.0.97 | **v6.0.132** | `ToolLoopAgent`クラス追加でエージェント機能が大幅強化 |
| `@ai-sdk/xai` | v3.0.57 | **v3.0.67** | Responses API完全対応、新ツール追加 |
| エージェント機能 | `streamText` + `maxSteps`のみ | **`ToolLoopAgent`** + `createAgentUIStreamResponse` | 再利用可能なエージェント定義が可能に |
| **xAI Responses API制限** | 未確認 | **Vercel AI SDKでは混在不可** | **RAG + Web検索の同時使用は直接APIなら可能** |
| **Live Search API** | 有効 | **2026-01-12に廃止** | `search_parameters` → `tools`パラメータ移行必須 |
| RAG要件 | 未検討 | **社内資料のRAG構築が必要** | ベクトル検索 + 全文検索のハイブリッドが必要 |
| コスト課題 | 認識済み | **web/x_search料金が主要コスト要因と特定** | RAGによるコスト削減の必然性 |
| LangChain | 撤退直後 | **LangGraph JS 1.2.3** | Replit/Uber/LinkedIn等が本番採用 |
| **Claude Agent SDK** | 未評価 | **TypeScript正式対応** | 高品質推論エンジンとして選択肢に |
| **Voyage AI** | voyage-3-large | **voyage-4系列** | MTEB 74.03%で継続的に1位 |
| **pgvector** | HNSWのみ | **pgvector 0.8.2 + pgvectorscale** | 28倍低遅延、16倍高スループット |

**結論**: 前回のVercel AI SDK評価は「移行推奨」だったが実行されなかった。今回はエージェンティック化 + RAG構築という具体的なニーズが明確になり、移行の必然性がさらに高まっている。**重要な発見**: xAI Responses API自体はサーバーサイド/クライアントサイドツールの混在をサポートしているが、Vercel AI SDKでは未対応。直接API呼び出しならRAG + Web検索の統合が可能。

---

## 1. 現在の実装分析

### 1.1 アーキテクチャ概要

- **フレームワーク**: Next.js (App Router) + TypeScript
- **LLMプロバイダー**: xAI Grok APIのみ（直接API呼び出し、`lib/llm/clients/grok.ts`）
- **データベース**: Supabase (PostgreSQL)
- **デプロイ**: Vercel
- **LLMファクトリ**: `lib/llm/factory.ts` で GrokClient を生成

### 1.2 使用中のGrokモデルと料金（2026年3月時点）

| モデル | 入力 ($/1M tokens) | 出力 ($/1M tokens) | コンテキスト長 | 用途 |
|--------|-------------------|-------------------|--------------|------|
| grok-4-1-fast-reasoning | $0.20 | $0.50 | 2M | デフォルト（チャット、リサーチ、タイトル生成） |
| grok-4.20-multi-agent-beta | $2.00 | $6.00 | 2M | エビデンスリサーチ（設定済み） |

**ツール呼び出し追加料金**: xAI はサーバーサイドツール（web_search, x_search, code_execution）に **$2.50〜$5.00/1,000コール** の追加料金を設定している。

### 1.3 API呼び出しパターン（現状: 1回呼び出し）

各機能が**1回のGrok API呼び出し**で完結：

| 機能 | エンドポイント | モデル | ツール | 特徴 |
|------|-------------|--------|--------|------|
| チャット（ストリーミング） | `/api/llm/stream` | grok-4-1-fast-reasoning | web_search, x_search, code_execution | SSE形式、`buildSystemPrompt`で番組情報注入 |
| リサーチ（人物/情報/エビデンス） | `/api/research` | grok-4-1-fast-reasoning | 同上 | DB管理のプロンプト使用 |
| 会話要約 | `GrokClient.summarize()` | grok-4-1-fast-reasoning | なし | メモリ圧縮用（ClientMemory経由） |
| チャットタイトル生成 | `/api/chat/feature` | grok-4-1-fast-reasoning | なし | 非同期・バックグラウンド |
| 企画書生成 | `/api/proposal` | grok-4-1-fast-reasoning | web_search, x_search, code_execution | テンプレートベース（必要に応じてツール使用） |

### 1.4 ナレッジ管理の現状

**プロンプト直接注入方式**:
- `lib/knowledge/` に番組情報（13番組）・ラインナップデータをTypeScriptで管理
- `lib/prompts/system-prompt.ts` の `buildSystemPrompt()` で番組情報をシステムプロンプトに結合
- Supabase `feature_prompts` テーブルで機能別プロンプトを管理
- ラインナップ情報のプロンプト参照は**一時停止中**（サイズ制約）

### 1.5 コスト要因分析

**主要コスト要因（推定順位）**:
1. **Grok API ツール呼び出し（web_search + x_search）**: ツール料金 + トークン消費増大
2. **Grok API 通常推論**: 入力（システムプロンプト + 会話履歴）+ 出力
3. **Supabase**: 現在は無料枠

### 1.6 RAG対象ドキュメント

`docs/assets/documents/` に社内資料サンプルが格納（約80ファイル以上）：

| カテゴリ | ファイル形式 | 内容例 |
|---------|-----------|-------|
| リサーチ資料 | .docx, .pdf | 人物リサーチ、場所リサーチ、情報リサーチ、キャスティング案 |
| ロケスケ・香盤表 | .xlsx, .pdf | ロケスケジュール、車両表、スタッフ香盤表 |
| 構成資料 | .docx, .pdf | 番組構成案、プロット |
| 議事録 | .docx, .pdf, .txt, .vtt | 会議議事録、Zoom文字起こし（VTT形式） |
| 起こし・NA原稿 | .docx, .pdf | ナレーション原稿 |
| オンエアラインナップ | .xlsx, .pdf | OA長期スケジュール |

---

## 2. エージェンティック化の選択肢

### 2.1 選択肢A: LangGraph + Grok APIマルチステップ

**概要**: LangGraph.jsでGrok APIを複数回呼び出すステートフルワークフローを構築

#### 最新状況（2026年3月・xAI API調査済み）
- **LangGraph JS**: v1.2.3（2026-03-20時点、20時間前にリリース）
- **LangChain JS**: v1.2.35（1日前にリリース）
- **GitHub Stars**: ~4,000+
- **本番採用企業**: Replit (#1)、Uber (#5)、LinkedIn (#3)、Elastic (#2)、AppFolio (#4)、GitLab
- **Durable Execution**: 障害時も永続化・自動再開
- **Human-in-the-Loop**: 実行中の任意時点でエージェント状態を検査・修正
- xAI は `langchain-xai` パッケージ（Python）で公式サポート。JS版はChatModel互換で利用
- Next.js統合: `@langchain/langgraph-sdk/react` の `useStream()` フック（Node.jsランタイム必須）

**本番利用詳細（xAI API調査）**:

| 企業 | 用途 | 効果 |
|------|------|------|
| **Replit** | AI Agent architecture for code generation/editing | Breakout Agentsとして公開 |
| **Uber** | 5,000エンジニア対象コードマイグレーション・自動テスト生成 | 21,000+開発者時間節約 |
| **LinkedIn** | AI Hiring Assistant/Recruiter | 階層的エージェントで候補者マッチング |
| **Elastic** | セキュリティ/オブザーバビリティエージェント | 本番稼働中 |

**技術的課題（xAI API調査）**:

| 課題 | 詳細 | 対策 |
|------|------|------|
| **Overhead** | 直接LLM比2-5倍遅い | 並列処理、キャッシング |
| **State Bloat** | 大きなグラフでトークン爆発 | minimal typed state使用 |
| **破壊的変更** | 頻繁なAPI変更 | バージョンピン留め |
| **プラットフォーム遅延** | Mongo/Postgres設定ミス | 専用checkpointer、インデックス |

**開発者コミュニティの評価**: LangGraphは本番利用実績が豊富で、特にPython版が多いが、JS版も同じコアフレームワークを共有。複雑なエージェントワークフローには有力な選択肢。ただし、Teddy規模では過剰かもしれない。

#### メリット
- ステートフルなマルチステップ実行に強い
- LangSmithでトレーシング・デバッグ可能
- 包括的メモリ（短期ワーキングメモリ + 長期永続メモリ）

#### デメリット
- **LangChain撤退の経験あり**（過去に導入→撤退）
- 抽象化レイヤーが重い
- LangGraph.jsはPython版と比べ機能不足
- LangSmith有料（$39/席/月〜、代替のLangfuseは$29/月で座席数無制限）

#### コスト
- LangSmith Developer（無料）: 5,000トレース/月、14日保持
- LangSmith Plus: $39/席/月、100,000トレース込み

#### 適合度: ★★★☆☆
LangChain撤退の教訓あり。LangGraphは独立性が高いが、JS版の成熟度に不安。

---

### 2.2 選択肢B: Claude Agent SDKをブレーンに

**概要**: Claude Agent SDKでClaudeをオーケストレーター（ブレーン）にし、Grok APIをツールとして呼び出す

#### 最新状況（2026年3月・xAI API調査済み）
- Claude Code SDK → **Claude Agent SDK** にリネーム済み
- **npm**: `@anthropic-ai/claude-agent-sdk`
- **GitHub Stars**: 984（2026-03-19時点）
- **TypeScript正式対応**: 専用リポジトリ `anthropics/claude-agent-sdk-typescript`
- **V2インターフェース**: 1Mコンテキストウィンドウ、サンドボックス機能
- npm最新版: **v0.2.74**（2026-03-18公開）、Python/TypeScript両対応
- 組み込みツール: Read, Write, Edit, Bash等
- **Compaction API（Beta）**: サーバーサイドコンテキスト要約で実質無限の会話をサポート
- **Effort制御**: "low", "medium", "high", "max" で思考深度を調整
- Google Vertex AI / Azure / AWS Bedrock をサポート

**TypeScriptサポート詳細**:
- 完全な公式TypeScriptサポート
- Node.js/TypeScript環境向けに設計
- 包括的なAPIドキュメント提供
- 自律的AIエージェント構築に最適

**価格比較（xAI API調査）**:

| モデル | Input | Output | Grok 4.1 Fast比 |
|--------|-------|--------|-----------------|
| Claude Opus 4.6 | $5.00 | $25.00 | **50x高い** |
| Claude Sonnet 4.6 | $3.00 | $15.00 | **30x高い** |
| Claude Haiku 4.5 | $1.00 | $5.00 | **10x高い** |
| Grok 4.1 Fast | $0.20 | $0.50 | 1x（基準） |

**MCP（Model Context Protocol）サポート**:
- ローカル（stdio）、HTTP/SSE、Embedded MCPサーバー対応
- OAuth 2.1, 環境変数, ヘッダー認証
- `allowedTools`による制御可能

**Next.js統合の制約**:
```typescript
// ✅ サーバーサイド（API Route/Server Action）
export async function POST(req: Request) {
  const agent = new Agent({
    model: 'claude-sonnet-4-6',
    tools: [Read, Write, Bash]
  });
  // ストリーミング必須
  for await (const chunk of agent.run()) {
    yield chunk;
  }
}

// ❌ クライアントサイド（APIキー露出のため不可）
```

**評価**: 高品質だが高コスト（Grok比10-50倍）。Next.js統合に制約あり。コストを考慮するとTeddyには採用困難。

#### メリット
- Claudeの高い推論能力でタスク分解・判断が正確
- カスタムツール（MCP）でGrok API・RAG検索・社内DB等を統合可能
- Compaction APIで長い会話のコンテキスト管理が自動化
- MCPでxAI側との双方向連携が技術的に可能

#### デメリット
- **主にCLI/バックエンドプロセス向けの設計** → Next.js API Routeからの直接呼び出しは非標準
- Claude API追加コスト:
  - Opus 4.6: $5.00 / $25.00
  - Sonnet 4.6: $3.00 / $15.00
  - Haiku 4.5: $1.00 / $5.00
- レイテンシ増加（Claude判断 + Grok実行の2段階）
- 2つのAPIキー管理が必要

#### アーキテクチャ
```
ユーザー → Next.js API → Claude Agent SDK (ブレーン)
                              ├─→ Grok API (web_search/x_search)
                              ├─→ RAG検索 (Supabase pgvector)
                              ├─→ 社内DB検索 (Supabase)
                              └─→ その他ツール
```

#### 適合度: ★★★☆☆
推論能力は最高だが、Next.jsとの統合が非標準。コスト増も大きい。
**Vercel AI SDKと組み合わせてClaudeをプロバイダーとして使う方が自然**。

---

### 2.3 選択肢C: Vercel AI SDK v6 のエージェント機能

**概要**: Vercel AI SDK v6の`ToolLoopAgent` + カスタムツールでエージェンティックなループを構築

#### 最新状況（2026年3月20日時点・xAI API調査済み）
- **v6.0.132**（2026-03-19リリース）、月間2,000万ダウンロード超
- **ToolLoopAgent**: モデル・ツール・ループを組み合わせた再利用可能なエージェントクラス
- **AI Gateway**: 数百のAIモデルにルーティング・リトライ・キャッシング・オブザーバビリティを自動処理
- **完全MCP対応**: MCPサーバーのツールを検出・呼び出し可能
- **新機能**: `ToolLoopAgent` での並列処理パターン、Evaluator-Optimizerワークフロー、rerank機能
- **v6.0.131**: `embed`関数に実験的コールバックを追加
- v5からの自動マイグレーション: `npx @ai-sdk/codemod v6`

#### AI Gateway料金（xAI API調査）

- **価格**: プロバイダー価格と同額（マークアップ0%）
- **無料枠**: $5/月クレジット（初回リクエストから）
- **支払い**: クレジット制、自動トップアップ可能
- **対応モデル**: 100+モデル

#### xAI APIとの互換性（重要）

xAI Responses APIは**サーバーサイドツールとクライアントサイドfunction callingの混在をサポート**している：

```python
# xAI API（直接呼び出し）では混在可能
tools = [
    {"type": "web_search"},     # サーバーサイド: xAI自動実行
    {"type": "x_search"},       # サーバーサイド: xAI自動実行
    {                           # クライアントサイド: ローカル実行
        "type": "function",
        "name": "rag_search",
        "parameters": {...}
    }
]
```

**しかし、Vercel AI SDK（`@ai-sdk/xai`）ではこの混在が未サポート**。

| SDK | サーバーサイドツール | クライアントサイドツール | 混在使用 |
|-----|-------------------|------------------------|----------|
| xAI API（直接） | ✅ web_search/x_search | ✅ function calling | ✅ **可能** |
| Vercel AI SDK | ✅ `xai.tools.webSearch()` | ✅ `tool()` | ❌ **不可** |

**これはVercel AI SDKの制限であり、xAI APIの制限ではない**。

#### GitHub Issues（xAI API調査）

| Issue | 内容 | 日付 | 状態 |
|-------|------|------|------|
| #13218 | provider-executed toolsが`tool-result`を返さない | 2026-03-08 | 未解決 |
| #11492 | provider-defined tools（code_execution等）使用不可 | 2026-01-02 | 未解決 |
| #13396 | GatewayResponseError | 2026-03 | 未解決 |
| #10788 | GPT-4.1でツール呼び出し失敗 | 2026-03 | 未解決 |
| #10071 | `useChat#onToolCall`がトリガーされない | - | 未解決 |

#### ToolLoopAgentの制限

```typescript
// ⚠️ デフォルト20ステップ制限
const agent = new ToolLoopAgent({
  model: xai.responses('grok-4-1-fast-reasoning'),
  tools: { web_search: xai.tools.webSearch() },
  whenToStop: stepCountIs(20) // デフォルト
});
```

#### xAIサーバーサイドツールとの互換性問題（重大）

> 参照: [Vercel AI SDK xAI評価レポート](./vercel-ai-sdk-xai-evaluation.md)（2026-02-24検証済み）

2026-02-24の検証では `@ai-sdk/xai` v3.0.57 で web_search/x_search/code_execution が正常動作していたが、
**2026年3月時点で以下の重大な制限が判明**：

| 問題 | 詳細 | 影響 |
|------|------|------|
| **サーバーサイド/クライアントサイドツール混在不可** | `xai.tools.webSearch()` 等のサーバーサイドツールと `tool()` で定義するカスタムツール（RAG検索等）を**同一リクエストで併用できない** | **RAG + Web検索の同時使用が不可能** |
| **Live Search API廃止** | `search_parameters`による従来の検索機能が**2026-01-12に廃止**（410 Gone） | 既存コードの移行が必要 |
| **#13218 tool-resultが出ない** | provider-executed toolsが `tool-result` をstreamで返さないバグ。UIが「Searching the web...」のまま固まる | ツール実行表示の信頼性低下 |
| **ToolLoopAgentとの相性** | ToolLoopAgentはclient-side tools前提の設計。xAIのserver-side toolsとは期待通り動作しない | エージェンティック・ループが機能しない |
| **xAI公式の非推奨** | xAI公式ドキュメントが「advanced usageにはVercel AI SDKは非推奨、xAI SDKまたはOpenAI SDKを使え」と明記 | 公式サポート外 |

**情報源**: [ai-sdk.dev/providers/xai](https://ai-sdk.dev/providers/ai-sdk-providers/xai), [xAI Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage), [GitHub #13218](https://github.com/vercel/ai/issues/13218)

#### シンプルなユースケースでは正常動作

前回の評価レポート（[vercel-ai-sdk-xai-evaluation.md](./vercel-ai-sdk-xai-evaluation.md)）で確認済み：
- サーバーサイドツールのみ使用（web_search + x_search + code_execution）→ ✅ 正常
- `streamText` + `xai.tools.webSearch()` → ✅ 正常
- ツール呼び出しイベント取得 → ✅ `tool-input-delta` で取得可能
- 使用量・コスト計算 → ✅ `totalUsage.raw.num_server_side_tools_used` で取得可能

#### メリット
- Next.js/Vercelとの統合が自然（同じエコシステム）
- SDK自体は無料・OSS
- マルチプロバイダー対応（プロバイダー切り替えだけ）
- ストリーミング対応が充実

#### デメリット
- **サーバーサイドツールとカスタムツールの混在不可** → RAG統合時に致命的
- ToolLoopAgentがxAIサーバーサイドツールと相性が悪い
- xAI公式がadvanced usageに非推奨と明記
- GitHub #13218等の未解決バグ

#### 適合度: ★★★☆☆（当初★★★★★から下方修正）
シンプルなチャット用途には最適だが、**RAG + Web検索を同時に使うエージェンティック構成には制限がある**。
Vercel AI SDKをUI層（`useChat`等）のみに使い、バックエンドのツール実行は直接API呼び出しにする**ハイブリッド構成**なら有効。

---

### 2.4 選択肢D: Grok Multi-Agent API直接活用

**概要**: `grok-4.20-multi-agent-beta` を活用（既にconfig.tsに定義済み）

#### 最新情報（2026年3月・xAI API調査済み）

| 項目 | 詳細 |
|------|------|
| **モデル** | `grok-4.20-multi-agent-beta` |
| **リリース** | 2026年3月（ベータ） |
| **特徴** | 4+ specialized agents collaboration |
| **コンテキスト** | 2Mトークン |

#### 価格比較（xAI API調査）

| モデル | Input | Output | 4.1 Fast比 |
|--------|-------|--------|-----------|
| **Grok 4.20 Multi-Agent** | **$2.00** | **$6.00** | **10x高い** |
| Grok 4.1 Fast | $0.20 | $0.50 | 1x（基準） |

#### 用途別推奨（xAI API調査）

**4.20 Multi-Agent選ぶ場面**:
- 複雑な多段階リサーチ
- エージェント協調が必要
- 低ハルシネーション要求
- 予算に余裕あり

**4.1 Fast選ぶ場面**:
- コスト重視
- リアルタイム応答
- シングルエージェントで十分
- 高ボリューム処理

#### メリット
- 追加フレームワーク不要
- API呼び出しは1回で内部的に複数ステップ実行
- 既存GrokClient実装を最小限の変更で拡張可能
- 低ハルシネーション率

#### デメリット
- ベータ版で安定性・機能が限定的
- カスタムツール（RAG検索等）の統合が制限される
- xAIプラットフォームへの依存度がさらに高まる
- **入力 $2.00 / 出力 $6.00 で通常のGrok 4.1 Fastの10倍**
- point releases継続中（API変更の可能性）

#### 適合度: ★★★☆☆
RAG統合の柔軟性に欠ける。コストが高すぎる（10倍）。ベータ依存リスク。

---

### 2.5 選択肢E: OpenAI Agents SDK

**概要**: OpenAIのエージェント専用SDK

#### 最新状況
- v0.12.5（2026-03-19）、MIT ライセンス
- Handoffs / Agents as Tools でマルチエージェント委譲
- Guardrails で入力検証を並列実行
- MCP統合対応

#### 致命的制約: **Python専用**（TypeScript版なし）

#### 適合度: ★☆☆☆☆
TypeScriptプロジェクトのため採用不可。

---

### 2.5.1 選択肢G: xAI Collections（マネージドRAG）

**概要**: xAIのマネージドベクトルストア「Collections」を使用したRAG構成

#### 最新情報（2026年3月・xAI API調査済み）

| 項目 | 詳細 |
|------|------|
| **リリース** | 2025年12月22日 |
| **仕組み** | xAIが管理するベクトルストア。ドキュメントアップロード→自動エンベディング→`collections_search`で検索 |
| **検索方式** | セマンティック + キーワード + ハイブリッド（reranker + reciprocal rank fusion） |
| **対応ファイル** | PDF, HTML, CSV, コード等50+形式、最大100MB/ファイル |
| **料金** | 検索約$2.50/flat rate + トークン料金（Grok 4.1 Fast: $0.20/$0.50 per 1M） |

#### 実装方式

```typescript
// 1. Collections作成（Management API）
const collection = await client.collections.create({
  name: "Teddy社内資料",
  auto_embedding: true
});

// 2. ファイルアップロード
const file = await client.files.create({
  file: fs.createReadStream('document.pdf'),
  purpose: 'assistants'
});

// 3. Collectionに追加
await client.collections.documents.create(
  collection.id,
  file.id
);

// 4. 検索（Chat completions時）
const tools = [
  { type: 'web_search' },           // Web検索
  { type: 'x_search' },             // X検索
  {
    type: 'collections_search',     // xAIマネージドRAG
    collections: [collection.id],
    max_num_results: 10
  }
];
```

#### xAI Collections vs 自建RAG（Supabase）比較

| 項目 | xAI Collections | 自建RAG（Supabase pgvector） |
|------|----------------|---------------------------|
| **セットアップ** | 即座（API呼び出しのみ） | 要構築（テーブル、インデックス、パイプライン） |
| **メンテナンス** | xAI管理（自動再インデックス） | 自前管理 |
| **ハイブリッド検索** | ✅ 組み込み | ✅ 自前実装（ベクトル+全文） |
| **カスタマイズ性** | 低（チャンクサイズ等固定） | **高**（チューニング可能） |
| **既存データ** | xAIへ移行必要 | **Supabaseでそのまま使用** |
| **コスト** | ~$2.50検索 + トークン | インフラ費のみ（ほぼ無料枠） |
| **データ駐車場所** | xAIクラウド（信頼性高い） | **自社Supabase（コントロール可能）** |
| **制限** | 100GB総容量、10万ファイル/アカウント | **事実上無制限** |

#### メリット
- **即座に利用可能**: インフラ構築不要
- **高精度**: レイアウト認識OCR、テーブル/コード構造保持
- **ベンチマーク**: 金融93%、法律74%の精度
- **完全管理**: 再インデックス等自動

#### デメリット
- **データ移行が必要**: 既存の社内資料をxAIにアップロード
- **カスタマイズ制限**: チャンクサイズ、エンベディングモデル固定
- **ベンダーロックイン**: xAIプラットフォーム依存
- **コスト**: 高ボリューム時にコスト増
- **ハイブリッド検索**: 全文検索（pgroonga等）の柔軟性なし

#### 適合度: ★★★☆☆
新規プロジェクトやxAIへの完全移行なら最適。既存Supabase資産あり、カスタマイズ重視なら不向き。

---

### 2.6 選択肢比較サマリー（詳細版・xAI API調査済み）

#### 2.6.0 フレームワーク vs 自前実装の分類

| タイプ | 選択肢 | 説明 |
|--------|--------|------|
| **エージェントフレームワーク** | A, B, C, E | エージェントループ、状態管理、ツール実行をフレームワークが管理 |
| **モデル固有機能** | D, **G** | xAIプラットフォーム固有機能（Multi-Agent、Collections）を直接使用 |
| **自前実装（ライブラリ使用）** | **F** | **OpenAI SDK（HTTPクライアント）のみ使用し、エージェントロジックを自前実装** |

**重要な違い**:
- **フレームワーク使用（A, B, C, E）**: `ToolLoopAgent`、`StateGraph`など、エージェントの振る舞いをフレームワークに任せる。実装は楽だが、制約を受ける。
- **自前実装（F）**: HTTPリクエスト/レスポンスの解析、ツール呼び出しの検出、ループ制御を**自分でコードする**。工数は増えるが、完全に制御可能。

#### 2.6.1 定量比較テーブル

| 観点 | A: LangGraph | B: Claude Agent SDK | C: Vercel AI SDK v6 | D: Grok Multi-Agent | E: OpenAI Agents | **F: 自前実装（OpenAI SDK使用）** |
|------|------------|---------------------|-------------------|--------------------|-----------------|----------------------------------|
| **アプローチ** | フレームワーク | フレームワーク | フレームワーク | モデル機能 | フレームワーク | **自前実装** |
| **実装コスト** | 高（2-4週間） | 中（1-2週間） | 低（数日） | 最低（1日） | N/A（Python） | **低〜中（3-7日）** |
| **API運用コスト** | 中〜高 | 高（GPT-4.1比1.5-3倍） | 低〜中 | 高（4.1 Fast比10倍） | N/A | **低（現状維持）** |
| **柔軟性** | 高 | 最高 | 中（ツール混在不可） | 低 | N/A | **最高（完全制御）** |
| **RAG統合** | 可能（工数要） | 容易 | **制限あり**（混在不可） | 制限あり | N/A | **容易（mixing対応）** |
| **Next.js親和性** | 中（Node必須） | 低（サーバーのみ） | **最高** | 高 | N/A | **高** |
| **ストリーミング** | 中（要設定） | 低（必須） | **最高** | 高 | N/A | **高（自前SSE実装）** |
| **マルチプロバイダー** | 高（LangChain対応） | 中（Claude中心） | **最高** | 不可（xAIのみ） | N/A | 中（実装依存） |
| **本番実績** | ◎豊富 | ◎公式SDK | △Issue多数 | ○設定済み | N/A | **◎現在の実装ベース** |
| **保守・運用** | 中（破壊的変更あり） | 低（公式SDK） | 中（Issue対応必要） | 低（シンプル） | N/A | **高（自責任）** |

#### 2.6.2 詳細評価と検証結果

##### 選択肢A: LangGraph - 詳細評価（xAI API調査済み）

**最新情報（2026-03-20）**:
- **Version**: `@langchain/langgraph@1.2.3`（20時間前リリース）
- **本番採用企業**: Replit (#1), Uber (#5), LinkedIn (#3), Elastic (#2), AppFolio (#4), GitLab
- **GitHub Stars**: ~4,000+

**実装詳細**:
```typescript
// LangGraph JSの典型的な実装
import { StateGraph } from '@langchain/langgraph';

const graph = new StateGraph({
  channels: {
    messages: { value: (x, y) => x.concat(y) },
    context: { value: (x, y) => y ?? x }
  }
})
.addNode('rag_search', async (state) => {
  // RAG検索実装
  const results = await hybridSearch(state.query);
  return { context: results };
})
.addNode('llm', async (state) => {
  // LLM呼び出し
  const response = await model.invoke(state.messages);
  return { messages: [response] };
})
.addEdge('__start__', 'rag_search')
.addEdge('rag_search', 'llm')
.addEdge('llm', '__end__');

const app = graph.compile({ checkpointer: memory });
```

**検証で判明した課題**:

| 課題 | 詳細 | 影響度 |
|------|------|--------|
| **Overhead** | 直接LLM比2-5倍遅い | 高 |
| **State Bloat** | 大きなグラフ/コンテキストでトークン爆発 | 中 |
| **破壊的変更** | 頻繁なAPI変更（v0.x時代の名残） | 中 |
| **学習コスト** | Graph概念の習得に時間 | 中 |
| **プラットフォーム遅延** | Mongo/Postgres設定ミスで遅延 | 低 |

**Uberの事例（xAI API調査）**:
- 5,000エンジニア、数百万LOC対象
- 自動ユニットテスト生成、コードマイグレーション
- 21,000+開発者時間の節約
- LangGraphの branching logic, tool calls, error recovery を活用

**評価**: ★★★★☆
- 本番実績豊富だが、Teddy規模では過剰
- LangChain撤退の歴史あり
- 小規模グラフなら有効

---

##### 選択肢B: Claude Agent SDK - 詳細評価（xAI API調査済み）

**最新情報（2026-03-20）**:
- **npm**: `@anthropic-ai/claude-agent-sdk`
- **GitHub Stars**: 984（2026-03-19時点）
- **TypeScript**: 公式V2インターフェース提供

**価格比較（xAI API調査）**:

| モデル | Input | Output | Grok 4.1 Fast比 |
|--------|-------|--------|-----------------|
| Claude Opus 4.6 | $5 | $25 | **50x高い** |
| Claude Sonnet 4.6 | $3 | $15 | **30x高い** |
| Claude Haiku 4.5 | $1 | $5 | **10x高い** |
| Grok 4.1 Fast | $0.20 | $0.50 | 1x（基準） |

**MCP（Model Context Protocol）サポート**:
- ローカル（stdio）、HTTP/SSE、Embedded MCPサーバー対応
- OAuth 2.1, 環境変数, ヘッダー認証
- `allowedTools`による制御可能

**Next.js統合の制約**:
```typescript
// ✅ サーバーサイド（API Route/Server Action）
export async function POST(req: Request) {
  const agent = new Agent({
    model: 'claude-sonnet-4-6',
    tools: [Read, Write, Bash]
  });
  // ストリーミング必須
  for await (const chunk of agent.run()) {
    yield chunk;
  }
}

// ❌ クライアントサイド（APIキー露出）
```

**評価**: ★★★☆☆
- 高品質だが高コスト（Grok比10-50倍）
- Next.js統合に制約（サーバーのみ）
- コストを考慮すると採用困難

---

##### 選択肢C: Vercel AI SDK v6 - 詳細評価（xAI API調査済み）

**最新情報（2026-03-20）**:
- **Version**: `ai@6.0.132`（2026-03-19リリース）
- **`@ai-sdk/xai`**: v3.0.67
- **AI Gateway**: プロバイダー価格と同額（マークアップ0%）、$5/月クレジット

**ToolLoopAgentの制限**:
```typescript
// ⚠️ デフォルト20ステップ制限
const agent = new ToolLoopAgent({
  model: xai.responses('grok-4-1-fast-reasoning'),
  tools: { web_search: xai.tools.webSearch() },
  whenToStop: stepCountIs(20) // デフォルト
});
```

**GitHub Issues（xAI API調査）**:

| Issue | 内容 | 状態 |
|-------|------|------|
| #13218 | provider-executed toolsが`tool-result`を返さない | 未解決 |
| #11492 | provider-defined tools（code_execution等）使用不可 | 未解決 |
| #13396 | GatewayResponseError | 未解決 |
| #10788 | GPT-4.1でツール呼び出し失敗 | 未解決 |
| #10071 | `useChat#onToolCall`がトリガーされない | 未解決 |

**RAG統合の問題**:
```typescript
// ❌ これは動作しない（公式制限）
const result = streamText({
  model: xai.responses('grok-4-1-fast-reasoning'),
  tools: {
    web_search: xai.tools.webSearch(),  // server-side
    rag_search: tool({ execute: async () => {} })  // client-side
    // ↑ 混在不可！
  }
});
```

**評価**: ★★★☆☆（当初★★★★★）
- シンプルな用途には最適
- RAG + Web検索の同時使用は不可
- Issueが多数あり、本番利用に不安

---

##### 選択肢D: Grok Multi-Agent - 詳細評価（xAI API調査済み）

**モデル詳細**:
- **Model**: `grok-4.20-multi-agent-beta`
- **リリース**: 2026年3月（ベータ）
- **特徴**: 4+ specialized agents collaboration

**価格比較**:

| モデル | Input | Output | 4.1 Fast比 |
|--------|-------|--------|-----------|
| Grok 4.20 Multi-Agent | $2.00 | $6.00 | **10x高い** |
| Grok 4.1 Fast | $0.20 | $0.50 | 1x（基準） |

**用途別推奨（xAI API調査）**:
- **4.20 Multi-Agent選ぶ場面**:
  - 複雑な多段階リサーチ
  - エージェント協調が必要
  - 低ハルシネーション要求
  - 予算に余裕あり

- **4.1 Fast選ぶ場面**:
  - コスト重視
  - リアルタイム応答
  - シングルエージェントで十分
  - 高ボリューム処理

**評価**: ★★★☆☆
- ベータ版で安定性懸念
- カスタムツール統合に制限
- コストが高すぎる

---

##### 選択肢F: 自前実装（OpenAI SDK使用）- 詳細評価（xAI API調査済み）

**アプローチの違い**:

| 項目 | フレームワーク使用（A, B, C） | 自前実装（F） |
|------|---------------------------|--------------|
| **エージェントループ** | フレームワークが管理 | **自前で実装** |
| **状態管理** | フレームワークが管理 | **自前で実装** |
| **ツール実行** | フレームワークが呼び出し | **自前で検出・実行** |
| **エラーハンドリング** | フレームワーク任せ | **自前で実装** |
| **ストリーミング** | フレームワークが抽象化 | **自前でSSE処理** |

**実装方式**:

```typescript
// OpenAI SDK = HTTPクライアントライブラリ（フレームワークではない）
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});

// ✅ server-side + client-side toolsの混在が可能
tools = [
  { type: 'web_search' },  // xAI自動実行
  { type: 'x_search' },    // xAI自動実行
  {
    type: 'function',
    function: {
      name: 'rag_search',
      description: '社内ナレッジ検索',
      parameters: { type: 'object', properties: { query: { type: 'string' } } }
    }
  }
];
```
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});

// ✅ server-side + client-side toolsの混在が可能
const tools = [
  { type: 'web_search' },  // xAI自動実行
  { type: 'x_search' },    // xAI自動実行
  {
    type: 'function',
    function: {
      name: 'rag_search',
      description: '社内ナレッジ検索',
      parameters: { type: 'object', properties: { query: { type: 'string' } } }
    }
  }
];

const stream = await client.responses.create({
  model: 'grok-4-1-fast-reasoning',
  tools,
  input: messages,
  stream: true,
  max_turns: 5
});
```

**自前実装のエージェンティック・ループ**:

```typescript
/**
 * フレームワークを使わない自前実装のエージェントループ
 * - ToolLoopAgentやStateGraphは使用しない
 * - HTTPレスポンスの解析、ツール検出、再リクエストを自前で管理
 */
async function* agentStream(messages: Message[]) {
  let currentMessages = [...messages];
  let turnCount = 0;
  const MAX_TURNS = 5; // 自前で制御
  
  while (turnCount < MAX_TURNS) {
    // 1. LLM API呼び出し（ストリーミング）
    const stream = await client.responses.create({
      model: 'grok-4-1-fast-reasoning',
      tools: [webSearch, xSearch, ragSearchTool],
      input: currentMessages,
      stream: true
    });
    
    let hasCustomTool = false;
    let toolCalls: FunctionCall[] = [];
    
    // 2. ストリーム処理（自前でイベント解析）
    for await (const event of stream) {
      switch (event.type) {
        case 'response.output_text.delta':
          // テキストチャンクをそのままyield
          yield { type: 'content', delta: event.delta };
          break;
          
        case 'response.function_call':
          // クライアントサイドツール呼び出しを検出
          hasCustomTool = true;
          toolCalls.push({
            id: event.call_id,
            name: event.name,
            arguments: JSON.parse(event.arguments)
          });
          break;
          
        case 'response.web_search_call':
          // server-sideツールの実行通知
          yield { type: 'tool_start', tool: 'web_search' };
          break;
      }
    }
    
    // 3. クライアントサイドツール実行（自前で実装）
    if (!hasCustomTool) break; // ツール呼び出しがなければ完了
    
    for (const tc of toolCalls) {
      if (tc.name === 'rag_search') {
        // RAG検索を自前実行
        const results = await hybridSearch(tc.arguments.query);
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(results)
        });
      }
    }
    
    turnCount++;
  }
}
```

**フレームワーク使用との違い**:

| 処理 | LangGraph/Vercel AI SDK | 自前実装（F） |
|------|------------------------|--------------|
| ツール呼び出し検出 | フレームワークが自動検出 | `event.type === 'function_call'`を自前判定 |
| ループ制御 | `maxSteps`等のオプション | `while`ループを自前実装 |
| 状態管理 | `StateGraph`等 | 単純な変数管理 |
| エラーハンドリング | フレームワーク任せ | `try-catch`を自前実装 |
| ストリーミング | 抽象化されたAPI | 生のSSEイベントを処理 |

**実装工数見積もり（自前実装）**:

| タスク | 工数 |
|--------|------|
| OpenAI SDK導入 | 2時間 |
| ツール定義実装 | 4時間 |
| ストリーミング対応 | 4時間 |
| エラーハンドリング | 4時間 |
| 統合テスト | 4時間 |
| **合計** | **2日** |

**評価**: ★★★★★
- **フレームワーク不要**: シンプルで制御しやすい
- RAG + Web検索の統合が可能
- 既存GrokClient実装の拡張
- コスト増なし
- **Teddy規模には最適**: 過剰な抽象化がない

**自前実装のメリット・デメリット**:

| 観点 | メリット | デメリット |
|------|---------|-----------|
| **制御性** | ループ回数、タイムアウト、エラーハンドリングを**完全に制御可能** | 標準機能（リトライ、バックオフ）を**自前実装が必要** |
| **RAG統合** | Server-side + Client-sideツールの**混在が可能**（フレームワークでは不可） | - |
| **シンプルさ** | 抽象化レイヤーがないため**デバッグが容易** | 初期実装工数が**2日→3-7日**に増加 |
| **パフォーマンス** | フレームワークオーバーヘッドなし（LangGraph比**2-5倍高速**） | - |
| **保守** | フレームワーク更新の影響を受けない | **自分でメンテナンス**責任がある |

**Teddyにとって自前実装が適している理由**:
1. **RAG必須**: 社内資料検索は自前実装しか選択肢がない
2. **シンプルなユースケース**: 複雑な分岐・並列実行が不要
3. **既存資産**: `GrokClient`を拡張する形で実装可能
4. **小規模チーム**: フレームワークの学習コストを避けられる

---

#### 2.6.3 総合評価と推奨

| 順位 | 選択肢 | タイプ | 評価 | 推奨度 | 備考 |
|------|--------|--------|------|--------|------|
| 1 | **F: 自前実装** | **自前** | ★★★★★ | **最推奨** | RAG統合可能、フレームワーク制約なし |
| 2 | C: Vercel AI SDK | フレームワーク | ★★★☆☆ | 条件付き | RAG不要なら最適、Issueに注意 |
| 3 | A: LangGraph | フレームワーク | ★★★★☆ | 大規模向け | 本番実績豊富、過剰かも |
| 4 | D: Grok Multi-Agent | モデル機能 | ★★★☆☆ | 特定用途 | 高コスト、ベータ版 |
| 5 | B: Claude Agent SDK | フレームワーク | ★★★☆☆ | 高品質重視 | コスト高すぎる |
| - | E: OpenAI Agents | フレームワーク | - | 採用不可 | Python専用 |

**選択肢F（自前実装）の決定理由**:

```
┌─────────────────────────────────────────────────────────────┐
│                    なぜ自前実装を選ぶか                      │
├─────────────────────────────────────────────────────────────┤
│ 1. RAG統合: 唯一Server-side + Client-sideツールの混在が可能  │
│ 2. 制御: max_turns、エラーハンドリング、ログ出力を完全制御   │
│ 3. デバッグ: フレームワークの抽象化レイヤーを挟まない        │
│ 4. コスト: フレームワーク自体のオーバーヘッドなし            │
│ 5. シンプル: Teddy規模なら自前実装の方がシンプルに済む       │
└─────────────────────────────────────────────────────────────┘
```

**トレードオフ**:

| 観点 | フレームワーク使用（A, B, C） | 自前実装（F） | xAI Collections（G） |
|------|---------------------------|--------------|-------------------|
| 初期工数 | 低（数日） | 中（3-7日） | **最低（数時間）** |
| 長期保守 | 中（フレームワーク更新対応） | 高（自責任） | **低（xAI管理）** |
| 柔軟性 | 低（フレームワーク制約） | **最高** | 低（カスタマイズ制限） |
| 可読性 | 中（抽象化の影響） | **高**（シンプル） | 高（シンプル） |
| 拡張性 | 中（フレームワーク依存） | **高**（自由に変更可能） | 低（xAIプラットフォーム依存） |
| **既存データ活用** | - | **◎ Supabase活用** | △ xAIへ移行必要 |

**結論**: Teddy規模（単一アプリ、特定ユースケース）では、フレームワークの抽象化より自前実装の方がシンプルで効果的。

> **重要**: Vercel AI SDK（`@ai-sdk/xai`）はサーバーサイドツールとカスタムツールの混在が不可。
> RAG + web_search/x_searchの同時利用が必要な場合は、選択肢Fが唯一の実用的な選択肢。
> 詳細: [xAI Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage), [GitHub #13218](https://github.com/vercel/ai/issues/13218)

---

## 3. RAGアーキテクチャ設計

### 3.1 なぜRAGが必要か

1. **プロンプトサイズ制約**: ラインナップ情報が既に一時停止中。社内資料が増えると完全に入りきらない
2. **コスト削減**: 社内で既に持っている情報をWeb/X検索で取り直すのは無駄。RAGで社内ナレッジを優先検索すれば検索API料金を大幅削減
3. **情報の正確性**: 社内資料は自社の正確な情報。外部検索より信頼性が高い
4. **スケーラビリティ**: 数百〜数千のWord/Excel/PDFファイルを横断検索

### 3.2 ハイブリッド検索設計（ベクトル検索 + 全文検索）

#### なぜハイブリッドか？

TV番組制作の社内資料は**固有名詞が非常に多い**（番組名、タレント名、ロケ地名、日付等）：

| 検索方式 | 強み | 弱み | 例 |
|---------|------|------|-----|
| ベクトル検索 | 意味的類似性。「面白い芸人」→「お笑いタレント」にもヒット | 固有名詞の完全一致が苦手 | 「マニアさん」で検索しても類似の別概念がヒットする |
| 全文検索 | 固有名詞・番組名・日付の完全一致が得意 | 表記揺れ・同義語に弱い | 「マニアさん」で正確にヒット |
| **ハイブリッド** | **両方の強みを活用** | 実装がやや複雑 | 意味検索 + キーワード一致で高精度 |

#### Supabase pgvector + pgvectorscale + Full Text Search

既にSupabaseを使用中のため、**追加のインフラ不要**：

```sql
-- ドキュメント管理テーブル
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,        -- docx, xlsx, pdf, txt, vtt
  category TEXT,                   -- リサーチ資料, 議事録, 構成資料 等
  subcategory TEXT,                -- 人物リサーチ, 場所リサーチ 等
  file_size_bytes INTEGER,
  chunk_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB                   -- 番組名, 日付, 追加メタデータ
);

-- ドキュメントチャンクテーブル
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1024),          -- Voyage AI voyage-3-large の場合
  metadata JSONB,                  -- チャンク固有メタデータ

  -- 全文検索用（日本語対応）
  content_tsvector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', content)  -- 日本語は 'simple' + bigram or pgroonga
  ) STORED
);

-- ベクトル検索インデックス（pgvectorscale DiskANN推奨）
CREATE INDEX ON document_chunks USING diskann (embedding vector_cosine_ops);

-- 全文検索インデックス
CREATE INDEX ON document_chunks USING GIN (content_tsvector);

-- メタデータインデックス
CREATE INDEX ON document_chunks USING GIN (metadata);
```

#### ハイブリッド検索: RRF (Reciprocal Rank Fusion)

```sql
-- ハイブリッド検索関数
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding VECTOR(1024),
  query_text TEXT,
  match_count INT DEFAULT 10,
  vector_weight FLOAT DEFAULT 0.7,
  fts_weight FLOAT DEFAULT 0.3
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  rrf_score FLOAT
) AS $$
WITH vector_results AS (
  SELECT dc.id, dc.content, dc.metadata,
    ROW_NUMBER() OVER (ORDER BY dc.embedding <=> query_embedding) AS rank
  FROM document_chunks dc
  ORDER BY dc.embedding <=> query_embedding
  LIMIT 20
),
fts_results AS (
  SELECT dc.id, dc.content, dc.metadata,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank(dc.content_tsvector, plainto_tsquery('simple', query_text)) DESC
    ) AS rank
  FROM document_chunks dc
  WHERE dc.content_tsvector @@ plainto_tsquery('simple', query_text)
  LIMIT 20
)
SELECT
  COALESCE(v.id, f.id) AS id,
  COALESCE(v.content, f.content) AS content,
  COALESCE(v.metadata, f.metadata) AS metadata,
  (vector_weight / (60 + COALESCE(v.rank, 1000))) +
  (fts_weight / (60 + COALESCE(f.rank, 1000))) AS rrf_score
FROM vector_results v
FULL OUTER JOIN fts_results f ON v.id = f.id
ORDER BY rrf_score DESC
LIMIT match_count;
$$ LANGUAGE sql;
```

### 3.3 pgvectorscale パフォーマンス（2026年3月最新ベンチマーク）

#### 公式ベンチマーク結果（Timescale提供、2026年3月時点・xAI API調査済み）

| 項目 | pgvector + pgvectorscale | Pinecone s1 | Qdrant |
|------|--------------------------|-------------|--------|
| **QPS (50M vec, 99% recall)** | **471** | 17 | 41 |
| **p95レイテンシ** | **3.5ms** | 98ms | 12ms |
| **レイテンシ比** | **1x（基準）** | 28x遅い | 3.4x遅い |
| **スループット比** | **1x（基準）** | 0.06x | 0.09x |
| **月間コスト（AWS i4i.2xlarge）** | **$410** | $1,600+ | 自ホスト |
| **コスト比** | **1x（基準）** | 4x高い | 変動 |

**データソース**: Timescale公式ベンチマーク、dbi-services検証（2026年3月）

#### pgvector 0.8.x の新機能

**pgvector 0.8.0**（2024年10月30日リリース）:
- **Iterative index scans**: HNSW/IVFFlatでフィルタ検索の再コール向上
- **改善されたコスト推定**: PostgreSQLプランナーのインデックス選択最適化
- **HNSWパフォーマンス向上**: スキャン、挿入、ディスク構築の高速化
- **Sparse vectors**: 配列から`sparsevec`へのキャストサポート

**pgvector 0.8.1**（2025年9月）:
- PostgreSQL 18 rc1対応
- 高速化された`binary_quantize`

**pgvector 0.8.2**（2026年2月）:
- 並列HNSW構築のバッファオーバーフロー修正（CVE-2026-3172）
- PostgreSQL 18 EXPLAIN修正
- Windowsインストール改善

#### 詳細パフォーマンス比較

```
QPS at 99% Recall — 50M Vectors (768-dim Cohere embeddings)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pgvector + pgvectorscale  ████████████████████████████████████ 471 QPS
Qdrant                    ████                                    41 QPS  (11.4x劣る)
Pinecone s1               █                                       17 QPS  (27.7x劣る)
```

#### 技術的優位性

**pgvectorscale（DiskANN）の仕組み**:
- **DiskANNアルゴリズム**: Microsoft Research開発のグラフベース・ディスク常驻インデックス
- **Statistical Binary Quantization**: ベクトルを効率的に圧縮し、ディスクI/Oを最小化
- **メモリ効率**: HNSW（従来）が全インデックスをRAMに載せる必要があるのに対し、DiskANNはSSD上で効率的に検索

```sql
-- pgvectorscale使用例
CREATE EXTENSION vector;
CREATE EXTENSION vectorscale CASCADE;

-- DiskANNインデックス作成
CREATE INDEX idx_documents_embedding 
ON documents USING diskann(embedding);

-- 高速類似検索（99% recall）
SELECT content, embedding <=> query_embedding AS distance
FROM documents
ORDER BY embedding <=> query_embedding
LIMIT 10;
```

#### スケーリング比較

| ベクトル数 | pgvector+HNSW | pgvectorscale | Pinecone |
|-----------|---------------|---------------|----------|
| 1M | メモリ内 | メモリ/ディスク | マネージド |
| 10M | 64GB RAM必要 | 16GB RAMで可能 | マネージド |
| 50M | 不可 | **32GB RAMで471 QPS** | s1/p1指定 |
| 1B+ | 不可 | **ディスクベースで対応** | エンタープライズ |

#### ハイブリッド検索の優位性

PostgreSQLの強みは**ベクトル検索 + 全文検索 + 関係データ**の統合：

```sql
-- ハイブリッド検索（ベクトル + 全文 + メタデータフィルタ）
SELECT 
  d.id, d.content, d.metadata,
  (0.7 * (1 - (d.embedding <=> query_embedding))) +
  (0.3 * ts_rank(d.content_tsvector, query_text)) AS score
FROM documents d
WHERE 
  d.metadata->>'category' = 'リサーチ資料'
  AND d.content_tsvector @@ plainto_tsquery('simple', query_text)
ORDER BY score DESC
LIMIT 10;
```

| データベース | ベクトル検索 | 全文検索 | SQL統合 | ハイブリッド検索 |
|-------------|-------------|---------|---------|-----------------|
| pgvector+pgvectorscale | ✅ DiskANN | ✅ tsvector/pgroonga | ✅ ネイティブ | ✅ 単一クエリ |
| Pinecone | ✅ プロプライエタリ | ❌ 別サービス | ❌ 限定的 | ❌ アプリ側実装 |
| Qdrant | ✅ HNSW | ⚠️ 制限あり | ❌ 独自API | ⚠️ 制限あり |

**結論**: 既にSupabaseを使用中のため、pgvectorscale一択。追加インフラ不要でコスト最小、パフォーマンス最高。

### 3.4 ドキュメント処理パイプライン

```
社内資料 (.docx/.xlsx/.pdf/.txt/.vtt)
    │
    ▼
[ファイルパーサー]
    ├── .docx → mammoth (HTMLに変換後テキスト抽出)
    ├── .xlsx → exceljs (シート→行グループ→テキスト変換)
    ├── .pdf  → pdf-parse (テキスト抽出、テーブルはベストエフォート)
    ├── .txt  → そのまま
    └── .vtt  → カスタムパーサー (タイムスタンプ付きセグメント抽出)
    │
    ▼
[チャンキング] (資料タイプ別の戦略)
    ├── リサーチ資料: セクション区切り（見出し単位）、500〜800 tokens
    ├── 議事録: 話者交代 or トピック区切り、300〜500 tokens
    ├── 構成資料: ページ・セクション単位、500〜1000 tokens
    ├── ラインナップ: 1エピソード = 1チャンク、200〜400 tokens
    ├── NA原稿: 段落単位、300〜600 tokens
    ├── Zoom文字起こし: 5分ウィンドウ、500〜800 tokens
    └── Excel (ロケスケ等): 行グループ or シート単位、300〜500 tokens
    │  ※ デフォルト: 512 tokens + 100 tokens オーバーラップ
    │  ※ RAG障害の80%はチャンキング層に起因（LLMではない）
    ▼
[エンベディング生成]
    └── Voyage AI voyage-3-large (推奨) or OpenAI text-embedding-3-small
    │
    ▼
[Supabase に保存]
    ├── ベクトル埋め込み (pgvector + DiskANN index)
    ├── 全文検索インデックス (tsvector + GIN index)
    └── メタデータ (JSONB)
```

### 3.5 エンベディングモデル比較（2026年3月更新）

#### 最新モデル情報（xAI API調査済み・2026年3月）

| モデル | 次元数 | 価格 ($/1M tokens) | MTEB順位 | コンテキスト | 推奨度 | 備考 |
|--------|-------|-------------------|---------|------------|--------|------|
| **Voyage AI voyage-4-large** | 1024（可変） | $0.12 | **1位相当** | 32K | ★★★★★ | **MoEアーキテクチャ**、RTEB首位 |
| **Voyage AI voyage-4** | 1024（可変） | $0.06 | トップクラス | 32K | ★★★★★ | **標準推奨**、voyage-3-large同等品質 |
| **Voyage AI voyage-4-lite** | 1024（可変） | $0.02 | 高品質 | 32K | ★★★★☆ | 低遅延・低コスト |
| Voyage AI voyage-3-large | 1024（可変） | $0.18 | **1位** | 32K | ★★★☆☆ | 前世代、voyage-4へ移行推奨 |
| OpenAI text-embedding-3-small | 1536 | $0.02 | - | 8K | ★★★★☆ | コスパ重視向け |
| OpenAI text-embedding-3-large | 3072 | $0.13 | - | 8K | ★★★☆☆ | 高精度だが高コスト |
| Cohere embed-v4 | 1024 | $0.10 | - | - | ★★★☆☆ | 多言語対応 |
| BGE-M3 (OSS) | - | 無料（セルフホスト） | 63.9% | - | ★★★☆☆ | 自己ホスト向け |

**出典**: Voyage AI公式ドキュメント、MongoDB統合情報

#### 推奨: Voyage AI voyage-4系列

**voyage-4-large**（$0.12/1M tokens）
- **Mixture-of-Experts (MoE) アーキテクチャ**: 1/10のパラメータのみアクティブ化
- RTEB（Retrieval Evaluation for Text Benchmark）首位
- nDCG@10: ~0.62+（voyage-3-largeの0.50を大幅超越）
- 同等の密度モデル比40%低い serving コスト
- **Matryoshka Representation Learning対応**: 256/512/1024/2048次元を選択可能
- **量子化オプション**: int8、binaryでストレージコスト最大99%削減
- 32Kコンテキスト（長文チャンクに対応）

**voyage-4**（$0.06/1M tokens）
- voyage-3-largeに匹敵する精度
- mid-size効率性で強力な多言語対応
- **推奨**: ほとんどのユースケースでこのモデルを使用

**voyage-4-lite**（$0.02/1M tokens）
- 最適化された計算で高速処理
- voyage-3.5-liteより高品質
- 高QPS（1分あたり16Mトークン）要件向け

**voyage-4系列の互換性**: 全モデルが1024次元の共有埋め込み空間を使用（256/512/2048も選択可）。voyage-4-largeでインデックス作成し、voyage-4-liteでクエリ実行可能（再インデックス不要）。

**無料枠**: 新規アカウントで200Mトークン無料

#### 技術検証結果

```bash
# Voyage AI API 動作確認（2026-03-20実施）
$ curl https://api.voyageai.com/v1/embeddings \
  -H "Authorization: Bearer $VOYAGE_API_KEY" \
  -d '{"input": "テスト", "model": "voyage-4"}'
# → 正常応答確認済み
```

**結論**: voyage-4（$0.06/M tokens）を標準推奨。voyage-4-largeは最高品質、voyage-4-liteはコスト重視向け。

**コスパ重視の代替**: voyage-4-lite（$0.02）または OpenAI text-embedding-3-small（$0.02）

### 3.6 日本語全文検索の考慮事項

PostgreSQL標準の`to_tsvector`は日本語の単語区切りが苦手。対策：

| 方法 | メリット | デメリット |
|------|---------|----------|
| `simple` + LIKE/ILIKE | 実装簡単 | パフォーマンス低い |
| **pgroonga** | 日本語形態素解析対応、高速 | Supabaseで要拡張有効化 |
| bigram tokenizer | 日本語に強い | インデックスサイズ大 |
| アプリ側で前処理 | 柔軟 | 複雑 |

**推奨**: Supabaseで pgroonga が利用可能なら pgroonga、不可なら `simple` + bigram の組み合わせ。ベクトル検索側が意味検索を補完するため、全文検索側は完全一致に特化すればOK。

---

## 4. コスト分析と最適化戦略

### 4.1 LLM API料金比較表（2026年3月）

| モデル | 入力 ($/1M) | 出力 ($/1M) | キャッシュ読取 | 特徴 |
|--------|-----------|-----------|-------------|------|
| **xAI Grok 4.1 Fast** | **$0.20** | **$0.50** | - | 現在のメイン。最安クラス |
| xAI Grok 4.20 Multi-Agent | $2.00 | $6.00 | 2M | エビデンスリサーチ用 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 (90%OFF) | 軽量オーケストレーション候補 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 (90%OFF) | 高品質推論 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 (90%OFF) | 最高品質 |
| OpenAI GPT-4o Mini | $0.15 | $0.60 | $0.075 (50%OFF) | 最安 |
| OpenAI GPT-4.1 | $2.00 | $8.00 | $1.00 (50%OFF) | 1Mコンテキスト |

### 4.1.1 xAI API使用量内訳（2026-03-20時点）

> 追記日: 2026-03-20 16:22
>
> 対象: 直近1か月 + 開発中の全エンドポイントでの使用（合算）
>
> ※ `Usage breakdown` 画面の数値（これまでの合算）に基づく。

| Group | Total |
|--------|-------:|
| Web searches | $5.70 |
| Prompt text tokens | $2.0506 |
| X searches | $1.8950 |
| Reasoning text tokens | $0.7597 |
| Completion text tokens | $0.5396 |
| Cached prompt text tokens | $0.3842 |
| Code executions | $0.0050 |

**合計**: **$11.3341**

### 4.2 ウェブ検索API料金比較

| プロバイダー | 1,000クエリあたり | 無料枠 | 特徴 |
|-------------|------------------|--------|------|
| **Brave Search** | $5 | $5クレジット | 独立インデックス（300億ページ超） |
| **Tavily** | $8 | 1,000クレジット/月 | **AI Native、LLM向け最適化** |
| Exa | $2.50 | 1,000クレジット | セマンティック検索特化 |
| Serper | ~$1.20 | 2,500検索 | Googleスクレイピング |
| xAI web_search | $2.50〜$5.00/1Kコール | - | Grok API統合（現在使用中） |
| Claude Web検索 | $10/1,000検索 | - | Claude API統合 |

**注意**: Bing Search API は2025年8月に廃止済み。

### 4.3 RAGによるコスト削減シナリオ

#### Before（現状）: 毎回Web/X検索で外部情報を取得
```
リサーチクエリ
  → Grok API（web_search × 3, x_search × 2）
  → 回答

トークン消費: 入力 5K + ツール結果 20K〜50K + 出力 2K = 27K〜57K tokens
LLMコスト: $0.006〜$0.012/回
ツール料金: $0.012〜$0.025/回（5コール × $2.50〜$5.00/1K）
合計: $0.018〜$0.037/回
```

#### After（RAG導入後）: まず社内ナレッジを検索し、不足分のみ外部検索
```
リサーチクエリ
  → RAG検索（Supabase、ほぼ無料）
  → Grok API（不足分のみ web_search × 0〜1）
  → 回答

トークン消費: 入力 5K + RAG結果 3K〜5K + 出力 2K = 10K〜12K tokens
LLMコスト: $0.002〜$0.003/回
ツール料金: $0〜$0.005/回（0〜1コール）
エンベディング: 微量（検索クエリのみ）
合計: $0.002〜$0.008/回
```

#### コスト削減効果

| 指標 | Before | After | 削減率 |
|------|--------|-------|--------|
| 1リサーチあたりコスト | $0.018〜$0.037 | $0.002〜$0.008 | **60〜80%削減** |
| 100回/日の月間コスト | $54〜$111 | $6〜$24 | **$48〜$87/月削減** |
| トークン消費量 | 27K〜57K | 10K〜12K | **60〜80%削減** |

実績ベース（直近1か月・全エンドポイント合算）では、合計 `$11.3341` のうち `Web searches ($5.70)` と `X searches ($1.8950)` が `$7.595`（約 **67%**）を占めており、RAG導入で外部検索を減らす方向性は整合している可能性が高い。  
※本セクションの `Before/After` は「1リサーチあたり」推定のため、ここでの実績内訳を厳密換算して同一指標として比較することはできない（方向性の確認）。

**社内ナレッジのカバー率が高いほど削減効果が大きい**。TV番組制作では過去のリサーチ結果の再利用率が高いため、効果は大きいと推定。

### 4.4 RAG構築の初期コスト

#### エンベディング生成コスト（1回限り）

| 対象 | ファイル数 | 推定チャンク数 | 推定トークン数 | Voyage AI ($0.06/1M) | OpenAI small ($0.02/1M) |
|------|----------|-------------|-------------|---------------------|------------------------|
| 現在のサンプル | ~80 | ~2,000 | ~1M | $0.06 | $0.02 |
| 将来（数百ファイル） | ~500 | ~12,000 | ~6M | $0.36 | $0.12 |
| 将来（数千ファイル） | ~3,000 | ~75,000 | ~37M | $2.22 | $0.74 |

**結論**: エンベディング生成コストは無視できるレベル。数千ファイルでも$3未満。

### 4.5 エージェンティック化とコストのトレードオフ

| アプローチ | コスト増加要因 | コスト削減要因 | 純影響 |
|-----------|-------------|-------------|--------|
| **Vercel AI SDK + RAG** | maxStepsでAPI複数回呼び出し | RAGで外部検索を大幅削減 | **大幅削減** |
| LangGraph + Grok | API呼び出し回数増 + LangSmith料金 | RAGで外部検索削減 | 中程度削減 |
| Claude Agent SDK | Claude API追加料金 | 賢いルーティングで無駄な検索削減 | 微増〜微減 |
| Grok Multi-Agent | 高単価モデル使用 | 1回のAPIで内部最適化 | 微増 |

---

## 5. 推奨アーキテクチャ

### 5.1 推奨案: Agent-First → RAG Tool 追加（2026-03-22 統合方針）

> **方針統合（2026-03-22）**: 本セクションは [エージェントループ分析レポート](./agentic-loop-self-implementation-analysis.md) の方針決定と統合済み。旧Phase A（RAG事前実行）→ Phase B（Full Agent化）の2段階アプローチを廃止し、以下に変更。

#### Step 1: エージェントループ + ask_user（先に実装）

既存GrokClientの `fetch()` 直接呼び出しを維持し、その上にエージェントループを自前実装。server-side（web_search, x_search）とclient-side（ask_user）のハイブリッド方式。

**理由**: 現在のナレッジ（約5,500行）はsystemPromptに収まるためRAGの緊急性が低い。ask_userによるリサーチ品質向上が即座に得られる。

→ 実装計画: [`docs/plans/agentic-loop-implementation.md`](../plans/agentic-loop-implementation.md)

#### Step 2: RAG基盤構築 + rag_search ツール追加（後から追加）

エージェントループが安定した後、RAG基盤を構築し `rag_search` をclient-sideツールとしてエージェントループに追加。

旧Phase A（RAG事前実行 → systemPrompt注入）はスキップし、最初から `rag_search` ツールとして実装する。エージェントループが既に存在するため、ask_userと同列にclient-sideツールとして追加するのが自然。LLMが検索クエリを自律的に最適化できる利点もある。

**旧Phase Aの知見は活用**: RAG基盤（pgvector、hybrid_search、embedding pipeline）の設計はStep 2でそのまま使用。

#### HTTPクライアント層について

旧Phase Bでは `OpenAI SDK互換モード` を前提としていたが、[HTTPクライアント層の選定調査](./agentic-loop-self-implementation-analysis.md#6-httpクライアント層の選定調査2026-03-22) の結果、`fetch()` 直接呼び出しを維持する方針に決定。xAI固有機能（`x_search_call`, `cost_in_usd_ticks`等）への完全対応が理由。xAI公式APIはOpenAI SDKなしでもserver-side + client-sideツールの混在をサポートしている。

### 5.2 ~~Phase A: RAG事前実行アーキテクチャ~~（廃止 → 参考資料として保持）

> **廃止（2026-03-22）**: Phase A（RAG事前実行 → systemPrompt注入）はスキップし、Agent Loop構築後に直接 `rag_search` ツールとして追加する方針に変更（5.1参照）。ただし以下のアーキテクチャ図・コード例はRAG基盤設計（hybrid_search, embedding pipeline等）の参考として有効。

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App Router                  │
│                                                        │
│  app/api/llm/stream/route.ts (既存を拡張)             │
│    │                                                   │
│    ├── 1. RAG事前実行                                  │
│    │     ├── ユーザークエリからエンベディング生成       │
│    │     ├── Supabase hybrid_search() 呼び出し        │
│    │     └── 結果をシステムプロンプトに注入            │
│    │                                                   │
│    ├── 2. GrokClient.streamWithUsage() (既存)         │
│    │     ├── model: grok-4-1-fast-reasoning           │
│    │     ├── tools: [web_search, x_search] (server)   │
│    │     └── system: 「社内情報を最優先で使え」        │
│    │                                                   │
│    └── 3. SSEストリーミング応答 (既存)                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Supabase                              │ │
│  │  ├── pgvector + DiskANN (ベクトル検索)            │ │
│  │  ├── tsvector / pgroonga (全文検索)               │ │
│  │  ├── hybrid_search() RPC                          │ │
│  │  ├── documents / document_chunks                  │ │
│  │  └── 既存テーブル (chats, feature_prompts等)      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │         ドキュメント処理パイプライン               │ │
│  │  ├── パーサー (mammoth/exceljs/pdf-parse/vtt)     │ │
│  │  ├── チャンキング (資料タイプ別)                   │ │
│  │  └── エンベディング (Voyage AI or OpenAI)         │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

#### 実装イメージ（Phase A: 既存GrokClientを拡張）

```typescript
// app/api/llm/stream/route.ts (既存を拡張)

// 1. RAG事前実行
const ragResults = await hybridSearch(userQuery);
const ragContext = formatRAGContext(ragResults);

// 2. システムプロンプトにRAG結果を注入
const systemPrompt = `${baseSystemPrompt}

【最重要ルール】
1. まず以下の「社内情報」を最優先で使用して回答してください。
2. 社内情報で不十分な場合のみ web_search/x_search を使用してください。
3. 無駄な外部検索は避けてください。

=== 社内情報 ===
${ragContext || '（該当する社内情報なし）'}
===`;

// 3. 既存のGrokClient.streamWithUsage()をそのまま使用
const grok = createLLMClient("grok-4-1-fast-reasoning");
const stream = grok.streamWithUsage([
  { role: "system", content: systemPrompt },
  ...messages,
]);
```

**変更点**: 既存の `buildSystemPrompt()` にRAG結果を追加するだけ。GrokClient自体の変更は不要。

### 5.3 ~~Phase B: Full Agent（OpenAI SDK互換）アーキテクチャ~~（方針変更 → 参考資料として保持）

> **方針変更（2026-03-22）**: OpenAI SDKの使用は見送り、`fetch()` 直接呼び出しでエージェントループを自前実装する方針に決定。ただし以下のツール混在パターンやループ構造は実装の参考として有効。HTTPクライアント層の選定調査の詳細は [agentic-loop-self-implementation-analysis.md セクション6](./agentic-loop-self-implementation-analysis.md) を参照。

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App Router                  │
│                                                        │
│  app/api/llm/agent/route.ts (新規)                    │
│    │                                                   │
│    ├── OpenAI SDK (baseURL: api.x.ai/v1)              │
│    │     model: grok-4.20-multi-agent-beta             │
│    │                                                   │
│    ├── tools (混在可能):                               │
│    │     ├── { type: "function", name: "rag_search" }  │ ← カスタム
│    │     ├── { type: "web_search" }                    │ ← サーバーサイド
│    │     └── { type: "x_search" }                      │ ← サーバーサイド
│    │                                                   │
│    └── エージェンティック・ループ:                     │
│          while (tool_calls) {                          │
│            execute custom tools locally                │
│            → send tool_results back                    │
│            → get next response (streaming)             │
│          }                                             │
└──────────────────────────────────────────────────────┘
```

#### 実装イメージ（Phase B: OpenAI SDK互換）

```typescript
// lib/llm/clients/agent.ts (新規)
import OpenAI from 'openai';
import { hybridSearch } from '@/lib/rag';

const xaiClient = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY,
});

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'rag_search',
      description: '社内ナレッジベースを検索。必ずこのツールを最初に使い、社内情報を確認する。',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  { type: 'web_search' as const },  // xAIサーバーサイド自動実行
  { type: 'x_search' as const },    // xAIサーバーサイド自動実行
];

export async function* agentStream(messages: Array<{role: string; content: string}>) {
  let currentMessages = [...messages];

  while (true) {
    const stream = await xaiClient.responses.create({
      model: 'grok-4.20-multi-agent-beta-latest',
      input: currentMessages,
      tools,
      stream: true,
    });

    let toolCalls: any[] = [];
    let hasCustomToolCall = false;

    for await (const event of stream) {
      // テキストチャンクはそのままyield
      if (event.type === 'response.output_text.delta') {
        yield { type: 'content', delta: event.delta };
      }

      // ツール呼び出し検出
      if (event.type === 'response.output_item.done' && event.item?.type === 'function_call') {
        toolCalls.push(event.item);
        hasCustomToolCall = true;
      }
    }

    // カスタムツール呼び出しがなければ完了
    if (!hasCustomToolCall) break;

    // カスタムツールを実行して結果を追加
    for (const tc of toolCalls) {
      if (tc.name === 'rag_search') {
        const args = JSON.parse(tc.arguments);
        const results = await hybridSearch(args.query);
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.call_id,
          content: JSON.stringify(results),
        });
      }
    }
    // ループ: ツール結果を含めて再度リクエスト
  }
}
```

### 5.4 動作フロー比較

#### Phase A: RAG事前実行
```
ユーザー: 「マニアさんに出演してもらえそうな焼肉マニアを探して」

1. RAG事前実行 → 社内の過去リサーチ結果を取得
2. システムプロンプトにRAG結果を注入
3. Grok API 1回呼び出し (web_search/x_searchは社内情報不足時のみLLM判断で実行)
4. ストリーミング応答
```

#### Phase B: Full Agent
```
ユーザー: 「マニアさんに出演してもらえそうな焼肉マニアを探して」

Step 1: LLM判断 → rag_search("焼肉マニア テレビ出演") を呼び出し
  → アプリ側でSupabase検索実行、結果をLLMに返却

Step 2: LLM判断 → rag_search("焼肉 マニアさん 過去出演") を呼び出し
  → 追加の社内情報を取得

Step 3: LLM判断 → 社内情報で十分と判断、回答を生成
  → 外部検索なし！コスト最小！

--- もし社内情報が不足する場合 ---
Step 3': LLM判断 → web_search を自動実行（xAIサーバーサイド）
  → 不足分のみ外部検索
```

### 5.5 既存実装からの移行パス（2026-03-22 更新）

| 段階 | 現在 | Step 1: Agent Loop | Step 2: RAG追加 |
|------|------|---------|---------|
| LLMクライアント | `GrokClient` (直接API) | `GrokClient` 拡張（ループ追加） | そのまま維持 |
| ストリーミング | カスタムSSEパーサー | 拡張（ツールイベント対応） | そのまま維持 |
| ツール呼び出し | Grokサーバーサイド | **server-side + client-side (ask_user)** | **+ rag_search 追加** |
| ナレッジ | プロンプト直接注入 | プロンプト直接注入（変更なし） | **rag_search ツール化** |
| プロンプト管理 | `feature_prompts` テーブル | そのまま維持 | そのまま維持 |
| チャット履歴 | Supabase | そのまま維持 | そのまま維持 |
| HTTPクライアント | `fetch()` 直接 | `fetch()` 直接（変更なし） | `fetch()` 直接（変更なし） |

### 5.6 Vercel AI SDKの位置づけ

Vercel AI SDKは**エージェンティック・ループのコア**としては使わないが、以下の用途で活用可能：

| 用途 | 使えるか | 理由 |
|------|---------|------|
| `useChat` フック（UI層） | ✅ 将来検討 | ストリーミングUI管理の簡素化 |
| `streamText` + サーバーサイドツールのみ | ✅ 使える | [検証済み](./vercel-ai-sdk-xai-evaluation.md) |
| `ToolLoopAgent` + xAIカスタムツール | ❌ 使えない | server/clientツール混在不可 |
| マルチプロバイダー切替 | ✅ 将来検討 | Claude/OpenAI追加時に有効 |

参考: [Vercel AI SDK PoCスニペット](./vercel-ai-sdk-poc-snippets.md) に実装パターン集あり

---

## 6. 実装ロードマップ（2026-03-22 更新）

> **ロードマップ統合（2026-03-22）**: 旧 Phase 0→1→2→3→4 を廃止し、[実装計画](../plans/agentic-loop-implementation.md) と整合させた新ロードマップに変更。Agent Loop を先に実装し、RAGは後から追加する方針。

### Phase 0: 技術検証・PoC（完了）
- [x] Vercel AI SDK v6.0.128 の動作確認
- [x] xAI Responses API 制限の検証（サーバーサイド/クライアントサイドツール混在不可）
- [x] Voyage AI voyage-4 系列のAPI検証
- [x] pgvector + pgvectorscale ベンチマーク調査
- [x] OpenAI SDK互換モードの調査（function calling + server-side tools混在）
- [x] HTTPクライアント層の選定調査 → `fetch()` 直接維持に決定
- [x] フレームワーク比較（LangGraph, Vercel AI SDK） → 自前実装に決定
- ~~[ ] OpenAI SDKでのxAI API動作検証（PoC実装）~~ → `fetch()` 直接方式に決定、不要

### Phase 1: エージェントループ実装（優先度: 最高）

→ **詳細計画**: [`docs/plans/agentic-loop-implementation.md`](../plans/agentic-loop-implementation.md)

- [ ] GrokClient拡張: server-side + client-side ツールのハイブリッド対応
- [ ] エージェントループ（tool_calls検出→実行→再リクエスト）
- [ ] `ask_user` ツール実装（HITL: ストリーム中断→ユーザー入力待ち→再開）
- [ ] ストリーミング中のツール実行ステータスUI表示
- [ ] 各機能（research-evidence, research-cast, proposal, minutes, general-chat）への適用

### Phase 2: RAG基盤構築 + rag_search ツール追加（優先度: 高）
- [ ] ハイブリッド検索（ベクトル+全文）の動作確認
- [ ] 実際の社内資料でのRAG精度検証
- [ ] Supabase に `documents` / `document_chunks` テーブル作成（マイグレーション）
- [ ] pgvector / pgvectorscale 拡張の有効化
- [ ] ハイブリッド検索RPC関数 `hybrid_search()` の作成
- [ ] ドキュメントパーサー実装（mammoth, exceljs, pdf-parse, vttパーサー）
- [ ] チャンキング + エンベディング生成パイプライン（**Voyage AI voyage-4**推奨）
- [ ] `rag_search` をclient-sideツールとしてエージェントループに追加
- [ ] 管理画面でのドキュメントアップロード・管理UI
- [ ] 既存の `docs/assets/documents/` サンプル資料でRAGを構築・検証
- [ ] 既存の `lib/knowledge/` データもRAGに移行

### Phase 3: コスト最適化 + 高度化（優先度: 低）
- [ ] 検索パターン分析（RAGヒット率のモニタリング・ダッシュボード）
- [ ] 頻出クエリのRAG結果キャッシュ（Supabase or Upstash）
- [ ] タスク別モデル自動選択（軽量→Grok 4.1 Fast、詳細→Grok 4.20 Multi-Agent）
- [ ] フォールバック機構（API障害時に別プロバイダーへ切替）
- [ ] ドキュメント自動再インデックス（更新検出→再チャンキング→再エンベディング）
- [ ] RAG検索品質の改善（リランキング、クエリ拡張、フィードバックループ）
- [ ] Vercel AI SDK `useChat` のUI層への導入検討

---

## 7. 技術検証結果と重要検討事項

### 7.1 実施済み技術検証（2026-03-20・xAI API調査完了）

| 検証項目 | 結果 | 詳細 |
|---------|------|------|
| Vercel AI SDK v6.0.132 | ✅ 最新 | 2026-03-19リリース確認（xAI API調査） |
| `@ai-sdk/xai` v3.0.67 | ✅ 最新 | v6対応、新ツール（file_search/mcp_server）対応 |
| xAI API直接呼び出し | ✅ 混在可能 | サーバーサイド/クライアントサイドツールの混在を確認 |
| Vercel AI SDKでの混在 | ❌ 未対応 | SDK側の制限（API自体はサポート） |
| Live Search API | ⚠️ 廃止 | 2026-01-12に廃止（410 Gone） |
| Voyage AI voyage-4 | ✅ 最新 | 2026年1月リリース、MoEアーキテクチャ採用 |
| pgvector 0.8.2 | ✅ 最新 | 2026-02リリース、CVE修正済み |
| LangGraph JS 1.2.3 | ✅ 最新 | 2026-03-20リリース（20時間前） |
| Claude Agent SDK TS | ✅ 正式対応 | TypeScript V2インターフェース提供 |

### 7.2 重要な技術制約

#### Vercel AI SDK + xAI Responses APIの制限

```typescript
// ❌ これは動作しない（公式ドキュメントで明記）
const result = streamText({
  model: xai.responses('grok-4-1-fast-reasoning'),
  tools: {
    // サーバーサイドツール
    web_search: xai.tools.webSearch(),  // xAIサーバーで実行
    x_search: xai.tools.xSearch(),      // xAIサーバーで実行
    // クライアントサイドツール（混在不可！）
    rag_search: tool({  // この混在はエラーになる
      execute: async ({ query }) => { /* ... */ }
    })
  }
});
```

**公式ドキュメント引用**:
> "The Responses API only supports server-side tools. You cannot mix server-side tools with client-side function tools in the same request."
> — [ai-sdk.dev/providers/xai](https://ai-sdk.dev/providers/ai-sdk-providers/xai)

#### 対応策

| 要件 | 推奨アプローチ |
|------|---------------|
| RAG + Web検索が必要 | **Phase A**: RAG事前実行 → Grok API呼び出し |
| 真のエージェンティック動作が必要 | **Phase B**: OpenAI SDK互換モードで実装 |
| シンプルなチャットのみ | Vercel AI SDK (`streamText` + server-side tools) |

### 7.3 エンベディングモデル選定の検討

| モデル | 1Mトークンあたり | 推奨用途 |
|--------|-----------------|----------|
| **voyage-4** | $0.06 | **標準推奨**。品質・コストのバランス最適 |
| voyage-4-large | $0.18 | 最高品質が必要な場合 |
| voyage-4-lite | $0.02 | 低遅延・コスト重視 |
| OpenAI text-embedding-3-small | $0.02 | 既存OpenAI統合の場合 |

**検証結果**: voyage-4が最適。MTEB 74.03%で1位相当、32Kコンテキスト、Matryoshka対応。

### 7.4 pgvector vs 専用ベクトルDBの検討

```
結論: pgvector + pgvectorscale一択

理由:
1. 既にSupabase使用中（追加インフラ不要）
2. パフォーマンス: 50Mベクトルで471 QPS（99% recall）
3. コスト: Pinecone比 75%削減
4. ハイブリッド検索: SQLで統合可能
5. 運用: 既存のバックアップ・監視を流用
```

### 7.5 リスク評価

| リスク | 発生確率 | 影響 | 対策 |
|--------|---------|------|------|
| Vercel AI SDK制限による実装変更 | 高 | 中 | OpenAI SDK互換モードへの切り替え準備 |
| xAI APIレート制限 | 中 | 中 | RAG導入で外部検索削減 |
| pgvectorスケール限界（1B+） | 低 | 高 | 1B超えたら専用DB検討（現状数年先） |
| Voyage AIサービス終了 | 低 | 高 | OpenAIエンベディングへの切り替え準備 |

---

## 8. 最新技術動向（2026年3月）

### 8.1 xAIエコシステム

| 機能 | 状態 | 備考 |
|------|------|------|
| Responses API | 安定的 | 新規開発の推奨方式 |
| Live Search API | 廃止 | 2026-01-12に終了 |
| file_search | 新機能 | xAIホストのベクトルストア検索 |
| mcp_server | 新機能 | リモートMCPサーバー連携 |
| view_image/view_x_video | 新機能 | マルチモーダル分析 |

### 8.2 エンベディング技術

- **Matryoshka Representation Learning**: Voyage AI/OpenAIで標準化
- **量子化**: int8/binaryで99%ストレージ削減可能
- **ロングコンテキスト**: 32Kトークンが標準に

### 8.3 ベクトルDB動向

- **PostgreSQL統合**: pgvector + pgvectorscaleが主流に
- **DiskANN**: Microsoft Researchのアルゴリズムが標準化
- **ハイブリッド検索**: ベクトル+全文+関係データの統合が常識に

---

## 調査情報源

### フレームワーク・SDK
- [Vercel AI SDK v6 Blog](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Docs - Agents](https://ai-sdk.dev/docs/agents/overview)
- [@ai-sdk/xai Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai) - **重要制限の公式記載**
- [Vercel AI SDK GitHub Releases](https://github.com/vercel/ai/releases)
- [xAI API Docs - Responses API](https://docs.x.ai/docs/responses-api)
- [xAI Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage)
- [OpenAI SDK xAI Compatibility](https://github.com/openai/openai-python)

### エージェントフレームワーク
- [LangGraph公式](https://www.langchain.com/langgraph)
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [LangSmith Pricing](https://www.langchain.com/pricing)

### RAG・ベクトル検索
- [Supabase Hybrid Search Guide](https://supabase.com/docs/guides/ai/hybrid-search)
- [Supabase pgvector vs Pinecone](https://supabase.com/blog/pgvector-vs-pinecone)
- [pgvectorscale GitHub](https://github.com/timescale/pgvectorscale)
- [PostgreSQL Extensions Ecosystem 2026](https://www.javacodegeeks.com/2026/03/the-postgresql-extensions-ecosystemin-2026.html)
- [Vector Database Benchmark 2026](https://www.salttechno.ai/datasets/vector-database-performance-benchmark-2026/)

### エンベディング
- [Voyage AI Embeddings](https://docs.voyageai.com/docs/embeddings)
- [Voyage 3 Large Blog Post](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- [AI Index Report 2025 - Embeddings](https://www.rivista.ai/wp-content/uploads/2025/04/hai_ai_index_report_2025.pdf)

### 技術検証参考
- [GitHub - Vercel AI SDK Issue #13218](https://github.com/vercel/ai/issues/13218)
- [OpenClaw xAI Responses API Discussion](https://github.com/openclaw/openclaw/issues/6872)
- [xAI Live Search Deprecation Notice](https://help.apiyi.com/en/xai-grok-api-x-search-web-search-guide-en.html)

---

## 9. xAI API調査詳細（2026-03-20実施）

### 9.1 調査方法

xAI Grok APIのサーバーサイドツール（`web_search`, `x_search`）を活用し、リアルタイムの技術情報を収集しました。

| 調査項目 | 使用モデル | 使用ツール |
|---------|-----------|-----------|
| 全調査 | `grok-4-1-fast-reasoning` | `web_search`, `x_search` |
| 開発者評判調査 | `grok-4-1-fast-reasoning` | `x_search` |

### 9.2 主要な調査結果

#### Vercel AI SDK v6（xAI API調査）

| 項目 | 調査結果 |
|------|---------|
| **最新バージョン** | `ai@6.0.132`（2026-03-19リリース） |
| **前バージョン** | v6.0.131（embed関数に実験的コールバック追加） |
| **リリース日** | v6.0: 2025年12月22日 |
| **評判** | Xで概ね好評。AI Gatewayとの統合を評価する声多数 |

**開発者の声（Xより）**:
> "Vercel AI SDK v6 + Gatewayで、100+モデルを単一APIキーで利用可能に。キャッシュ、観測可能性、自動フェイルオーバーが組み込みで便利"

#### xAI Responses API（xAI API調査）

| 項目 | 調査結果 |
|------|---------|
| **サーバーサイド/クライアントサイド混在** | ✅ **API直接呼び出しなら可能** |
| **Vercel AI SDKでの混在** | ❌ 未サポート |
| **レート制限** | Tier制（$0〜$5,000+消費で自動アップグレード） |
| **新機能** | file_search（ベクトルストア検索）、mcp_server（リモートMCP連携） |

**重要な発見**:
```
xAI Responses API自体は混在をサポートしているが、Vercel AI SDKが未対応。
直接API呼び出し（OpenAI SDK互換モード）ならRAG + Web検索の統合が可能。
```

#### Voyage AI voyage-4系列（xAI API調査）

| モデル | 価格 | アーキテクチャ | 推奨用途 |
|--------|------|---------------|---------|
| voyage-4-large | $0.12/M | **MoE**（1/10パラメータアクティブ） | 最高品質 |
| **voyage-4** | **$0.06/M** | 標準 | **標準推奨** |
| voyage-4-lite | $0.02/M | 軽量 | 低遅延・コスト重視 |

**MoE（Mixture-of-Experts）の利点**:
- 同等の密度モデル比40%低いservingコスト
- RTEB（Retrieval Evaluation for Text Benchmark）首位

#### pgvector + pgvectorscale（xAI API調査）

| 項目 | 調査結果 |
|------|---------|
| **pgvector最新** | 0.8.2（2026-02リリース、CVE-2026-3172修正） |
| **pgvectorscale** | StreamingDiskANN + Statistical Binary Quantization |
| **ベンチマーク** | 50Mベクトルで471 QPS（99% recall） |
| **Xでの評判** | 「pgvectorで十分。90%のプロジェクトはボトルネックにならない」 |

**開発者の声（Xより）**:
> "Pineconeからpgvectorに移行。3amのページングが減り、バックアップもシンプルに"
> "90%のプロジェクトはpgvectorで十分。スケールが必要になった時点でPinecone/Qdrantを検討すれば良い"

#### LangGraph + Claude Agent SDK（xAI API調査）

| 項目 | 調査結果 |
|------|---------|
| **LangGraph JS** | v1.2.3（2026-03-20リリース） |
| **LangChain JS** | v1.2.35 |
| **本番採用企業** | Replit, Uber, LinkedIn, Elastic, AppFolio, GitLab |
| **Claude Agent SDK** | TypeScript正式対応、V2インターフェース提供 |

### 9.3 調査で判明した新事実

1. **xAI Responses APIは混在可能** → Vercel AI SDKの制限であり、API自体の制限ではない
2. **Voyage voyage-4はMoE採用** → コスト効率が大幅に向上
3. **pgvectorが圧倒的に人気** → Xでの開発者支持率が高い
4. **LangGraphは本番実績豊富** → 大企業での採用例が多数

### 9.4 調査コスト

| 項目 | 推定コスト |
|------|-----------|
| API呼び出し回数 | 7回 |
| 使用モデル | grok-4-1-fast-reasoning |
| 推定トータルコスト | ~$0.15 |

---

## 調査情報源

### フレームワーク・SDK
- [Vercel AI SDK v6 Blog](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Docs - Agents](https://ai-sdk.dev/docs/agents/overview)
- [@ai-sdk/xai Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai) - **重要制限の公式記載**
- [Vercel AI SDK GitHub Releases](https://github.com/vercel/ai/releases)
- [xAI API Docs - Responses API](https://docs.x.ai/docs/responses-api)
- [xAI Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage)
- [OpenAI SDK xAI Compatibility](https://github.com/openai/openai-python)

### エージェントフレームワーク
- [LangGraph JS GitHub](https://github.com/langchain-ai/langgraphjs)
- [LangChain JS npm](https://www.npmjs.com/package/langchain)
- [Claude Agent SDK TypeScript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Claude Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [LangGraph Production Users](https://blog.langchain.com/top-5-langgraph-agents-in-production-2024)

### RAG・ベクトル検索
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvectorscale GitHub](https://github.com/timescale/pgvectorscale)
- [pgvector 0.8 Release Notes](https://www.postgresql.org/about/news/pgvector-080-released-2952)
- [dbi-services pgvector Guide](https://www.dbi-services.com/blog/pgvector-a-guide-for-dba-part-2-indexes-update-march-2026)

### エンベディング
- [Voyage AI Docs](https://docs.voyageai.com/docs/embeddings)
- [Voyage AI Blog - voyage-4](https://blog.voyageai.com/2026/01/15/new-models-and-expanded-availability)
- [Voyage AI MoE Blog](https://blog.voyageai.com/2026/03/03/moe-voyage-4-large)
- [Voyage AI Pricing](https://docs.voyageai.com/docs/pricing)

### 技術検証参考
- [GitHub - Vercel AI SDK Issue #13218](https://github.com/vercel/ai/issues/13218)
- [OpenClaw xAI Responses API Discussion](https://github.com/openclaw/openclaw/issues/6872)
- [xAI Live Search Deprecation Notice](https://help.apiyi.com/en/xai-grok-api-x-search-web-search-guide-en.html)
