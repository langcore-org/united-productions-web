# エージェンティック・アーキテクチャ & RAG戦略リサーチレポート

> 作成日: 2026-03-20
> ステータス: **調査完了**
> 対象: Teddy (TV番組制作支援AIアシスタント)

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
| Vercel AI SDK | v6.0.97 | **v6.0.121** | `ToolLoopAgent`クラス追加でエージェント機能が大幅強化 |
| `@ai-sdk/xai` | v3.0.57 | 安定版継続 | Responses API完全対応を確認済み |
| エージェント機能 | `streamText` + `maxSteps`のみ | **`ToolLoopAgent`** + `createAgentUIStreamResponse` | 再利用可能なエージェント定義が可能に |
| RAG要件 | 未検討 | **社内資料のRAG構築が必要** | ベクトル検索 + 全文検索のハイブリッドが必要 |
| コスト課題 | 認識済み | **web/x_search料金が主要コスト要因と特定** | RAGによるコスト削減の必然性 |
| LangChain | 撤退直後 | 撤退から1ヶ月、直接実装が安定稼働中 | 再導入の必要性なし |

**結論**: 前回のVercel AI SDK評価は「移行推奨」だったが実行されなかった。今回はエージェンティック化 + RAG構築という具体的なニーズが明確になり、移行の必然性がさらに高まっている。

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

#### 最新状況（2026年3月）
- LangGraphは Klarna、Replit、Elastic 等が本番採用
- **Durable Execution**: 障害時も永続化・自動再開
- **Human-in-the-Loop**: 実行中の任意時点でエージェント状態を検査・修正
- xAI は `langchain-xai` パッケージ（Python）で公式サポート。JS版はChatModel互換で利用
- Next.js統合: `@langchain/langgraph-sdk/react` の `useStream()` フック（Node.jsランタイム必須）

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

#### 最新状況（2026年3月）
- Claude Code SDK → **Claude Agent SDK** にリネーム済み
- npm最新版: **v0.2.74**（2026-03-18公開）、Python/TypeScript両対応
- 組み込みツール: Read, Write, Edit, Bash等
- **Compaction API（Beta）**: サーバーサイドコンテキスト要約で実質無限の会話をサポート
- **Effort制御**: "low", "medium", "high", "max" で思考深度を調整
- Google Vertex AI / Azure / AWS Bedrock をサポート

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

#### 最新状況（2026年3月）
- **v6.0.121**、月間2,000万ダウンロード超
- **ToolLoopAgent**: モデル・ツール・ループを組み合わせた再利用可能なエージェントクラス
- **AI Gateway**: 数百のAIモデルにルーティング・リトライ・キャッシング・オブザーバビリティを自動処理
- **完全MCP対応**: MCPサーバーのツールを検出・呼び出し可能
- v5からの自動マイグレーション: `npx @ai-sdk/codemod v6`

#### xAIサーバーサイドツールとの互換性問題（重大）

> 参照: [Vercel AI SDK xAI評価レポート](./vercel-ai-sdk-xai-evaluation.md)（2026-02-24検証済み）

2026-02-24の検証では `@ai-sdk/xai` v3.0.57 で web_search/x_search/code_execution が正常動作していたが、
**2026年3月時点で以下の重大な制限が判明**：

| 問題 | 詳細 | 影響 |
|------|------|------|
| **サーバーサイド/クライアントサイドツール混在不可** | `xai.tools.webSearch()` 等のサーバーサイドツールと `tool()` で定義するカスタムツール（RAG検索等）を**同一リクエストで併用できない** | **RAG + Web検索の同時使用が不可能** |
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

#### メリット
- 追加フレームワーク不要
- API呼び出しは1回で内部的に複数ステップ実行
- 既存GrokClient実装を最小限の変更で拡張可能

#### デメリット
- ベータ版で安定性・機能が限定的
- カスタムツール（RAG検索等）の統合が制限される
- xAIプラットフォームへの依存度がさらに高まる
- 入力 $2.00 / 出力 $6.00 で通常のGrok 4.1 Fastの10倍

#### 適合度: ★★★☆☆
RAG統合の柔軟性に欠ける。ベータ依存リスク。

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

### 2.6 選択肢比較サマリー

| 観点 | A: LangGraph | B: Claude Agent SDK | C: Vercel AI SDK v6 | D: Grok Multi-Agent | E: OpenAI Agents | **F: 直接API + OpenAI SDK互換** |
|------|------------|---------------------|-------------------|--------------------|-----------------|-------------------------------|
| 実装コスト | 高 | 中 | 低 | 最低 | N/A（Python） | **低〜中** |
| API運用コスト | 中〜高 | 高 | 低〜中 | 中 | N/A | **低** |
| 柔軟性 | 高 | 最高 | 中（ツール混在不可） | 低 | N/A | **高** |
| RAG統合 | 可能 | 容易 | **制限あり**（混在不可） | 制限あり | N/A | **容易（mixing対応）** |
| Next.js親和性 | 中 | 低 | 最高 | 高 | N/A | **高** |
| ストリーミング | 中 | 低 | 最高 | 高 | N/A | **高（自前SSE）** |
| マルチプロバイダー | 高 | 中 | 最高 | 不可 | N/A | 中 |
| 過去の経験 | △撤退歴 | ○ | ○検証済み | ○設定済み | N/A | **◎現在の実装を拡張** |

**選択肢F（直接API + OpenAI SDK互換）** は、現在の直接API実装（GrokClient）を基盤に、OpenAI SDK互換モードでRAGカスタムツールとサーバーサイドツールの混在を実現するアプローチ。xAI公式が推奨する方式。

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

### 3.3 pgvectorscale パフォーマンス

| 項目 | pgvectorscale (Supabase) | Pinecone | Qdrant |
|------|--------------------------|----------|--------|
| QPS (50M vec, 99% recall) | **471** | 低（s1/p1） | 41（11.4x劣る） |
| コスト | $410/月 (2XL) | $480+/月 | 自ホスト次第 |
| スケール | 数十億（DiskANNでメモリ効率） | マネージド | 自ホスト |
| ハイブリッド検索 | **SQL同居で容易** | 別途構成 | サポートあり |

**結論**: 既にSupabaseを使用中のため、pgvectorscale一択。追加インフラ不要でコスト最小。

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

### 3.5 エンベディングモデル比較

| モデル | 次元数 | 価格 ($/1M tokens) | MTEB順位 | コンテキスト | 推奨度 |
|--------|-------|-------------------|---------|------------|--------|
| **Voyage AI voyage-3-large** | 1024 | $0.06 | **1位** | 32K | ★★★★★ |
| OpenAI text-embedding-3-small | 1536 | $0.02 | - | 8K | ★★★★☆ |
| OpenAI text-embedding-3-large | 3072 | $0.13 | - | 8K | ★★★☆☆ |
| Cohere embed-v4 | 1024 | $0.10 | - | - | ★★★☆☆ |
| BGE-M3 (OSS) | - | 無料（セルフホスト） | - | - | ★★★☆☆ |

**推奨**: **Voyage AI voyage-3-large**
- MTEB リーダーボード1位
- OpenAI比 **9.74%高精度**、Cohere比 **20.71%高精度**
- コストは OpenAI large の半額以下、ストレージは1/3（1024次元 vs 3072次元）
- 32Kコンテキスト（長文チャンクに対応）

**コスパ重視の代替**: OpenAI text-embedding-3-small（$0.02/1M tokens、最安）

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

### 5.1 推奨案: RAG-First Hybrid Orchestration（2段階アプローチ）

Vercel AI SDKの「サーバーサイドツールとカスタムツールの混在不可」制限を踏まえ、**段階的な2つのアプローチ**を推奨する。

#### Phase A: RAG事前実行方式（まず実装、シンプル）

RAGを**API呼び出し前に事前実行**し、結果をシステムプロンプトに注入。Grok APIにはサーバーサイドツールのみ渡す。

**メリット**: 実装がシンプル、既存GrokClient実装を最小変更で拡張可能
**デメリット**: RAG検索とGrok判断が分離される（LLMが検索クエリを最適化できない）

#### Phase B: OpenAI SDK互換モードでFull Agent化（将来拡張）

OpenAI SDK（`baseURL: "https://api.x.ai/v1"`）を使うと、xAI Responses APIで**function calling（RAG等）とserver-side tools（web_search等）を同一リクエストで混在可能**。xAI公式ドキュメントがこの方式を推奨している。

**メリット**: LLMがRAG検索クエリを自律的に最適化、真のエージェンティック動作
**デメリット**: multi-turn tool callの実装が複雑

**情報源**: [xAI Advanced Usage](https://docs.x.ai/developers/tools/advanced-usage) - 「mixing server-side and client-side tools」はxAI SDK/OpenAI SDKで対応

### 5.2 Phase A: RAG事前実行アーキテクチャ（推奨スタート地点）

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

### 5.3 Phase B: Full Agent（OpenAI SDK互換）アーキテクチャ

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

### 5.5 既存実装からの移行パス

| 段階 | 現在 | Phase A | Phase B |
|------|------|---------|---------|
| LLMクライアント | `GrokClient` (直接API) | `GrokClient` (変更なし) | OpenAI SDK互換 (新規) |
| ストリーミング | カスタムSSEパーサー | そのまま維持 | カスタムSSE (拡張) |
| ツール呼び出し | Grokサーバーサイド | Grokサーバーサイド (変更なし) | function calling + server-side (混在) |
| ナレッジ | プロンプト直接注入 | **RAG事前実行 + プロンプト注入** | **RAGをカスタムツール化** |
| プロンプト管理 | `feature_prompts` テーブル | そのまま維持 | そのまま維持 |
| チャット履歴 | Supabase | そのまま維持 | そのまま維持 |

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

## 6. 実装ロードマップ

### Phase 1: RAG基盤構築（優先度: 最高）
- [ ] Supabase に `documents` / `document_chunks` テーブル作成（マイグレーション）
- [ ] pgvector / pgvectorscale 拡張の有効化
- [ ] ハイブリッド検索RPC関数 `hybrid_search()` の作成
- [ ] ドキュメントパーサー実装（mammoth, exceljs, pdf-parse, vttパーサー）
- [ ] チャンキング + エンベディング生成パイプライン（Voyage AI or OpenAI）
- [ ] 管理画面でのドキュメントアップロード・管理UI
- [ ] 既存の `docs/assets/documents/` サンプル資料でRAGを構築・検証
- [ ] 既存の `lib/knowledge/` データもRAGに移行

### Phase 2: RAG事前実行統合（Phase A実装、優先度: 高）
- [ ] `lib/rag/` モジュール作成（hybridSearch, formatRAGContext）
- [ ] 既存の `buildSystemPrompt()` にRAG結果注入ロジックを追加
- [ ] 「社内情報を最優先で使え」のプロンプト設計
- [ ] 既存 `/api/llm/stream` route にRAG事前実行を追加
- [ ] RAGヒット率のログ記録（外部検索が発生した割合を計測）
- [ ] コスト削減効果の検証

### Phase 3: Full Agent化（Phase B実装、優先度: 中）
- [ ] OpenAI SDK互換クライアント作成（`baseURL: api.x.ai/v1`）
- [ ] function calling (`rag_search`) + server-side tools (`web_search`, `x_search`) の混在実装
- [ ] エージェンティック・ループ（tool_calls検出→実行→再リクエスト）
- [ ] `grok-4.20-multi-agent-beta` での動作検証
- [ ] ストリーミング中のツール実行ステータス表示
- [ ] `previous_response_id` を活用したマルチターン最適化

### Phase 4: コスト最適化 + 高度化（優先度: 低）
- [ ] 検索パターン分析（RAGヒット率のモニタリング・ダッシュボード）
- [ ] 頻出クエリのRAG結果キャッシュ（Supabase or Upstash）
- [ ] タスク別モデル自動選択（軽量→Grok 4.1 Fast、詳細→Grok 4.20 Multi-Agent）
- [ ] フォールバック機構（API障害時に別プロバイダーへ切替）
- [ ] ドキュメント自動再インデックス（更新検出→再チャンキング→再エンベディング）
- [ ] RAG検索品質の改善（リランキング、クエリ拡張、フィードバックループ）
- [ ] Vercel AI SDK `useChat` のUI層への導入検討

---

## 調査情報源

- [Vercel AI SDK v6 Blog](https://vercel.com/blog/ai-sdk-6)
- [AI SDK Docs - Agents](https://ai-sdk.dev/docs/agents/overview)
- [@ai-sdk/xai Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
- [LangGraph公式](https://www.langchain.com/langgraph)
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Supabase Hybrid Search Guide](https://supabase.com/docs/guides/ai/hybrid-search)
- [Supabase pgvector vs Pinecone](https://supabase.com/blog/pgvector-vs-pinecone)
- [Voyage AI Embeddings](https://docs.voyageai.com/docs/embeddings)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [LangSmith Pricing](https://www.langchain.com/pricing)
