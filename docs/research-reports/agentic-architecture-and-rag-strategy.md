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
| 会話要約 | `GrokClient.summarize()` | grok-* | なし | メモリ圧縮用 |
| チャットタイトル生成 | `/api/chat/feature` | grok-4-1-fast-reasoning | なし | 非同期・バックグラウンド |
| 企画書生成 | `/api/proposal` | grok-* | 同上 | テンプレートベース |

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

### 2.3 選択肢C: Vercel AI SDK v6 のエージェント機能 ★推奨★

**概要**: Vercel AI SDK v6の`ToolLoopAgent` + カスタムツールでエージェンティックなループを構築

#### 最新状況（2026年3月）
- **v6.0.121**、月間2,000万ダウンロード超
- **ToolLoopAgent**: モデル・ツール・ループを組み合わせた再利用可能なエージェントクラス
- **AI Gateway**: 数百のAIモデルにルーティング・リトライ・キャッシング・オブザーバビリティを自動処理
- **完全MCP対応**: MCPサーバーのツールを検出・呼び出し可能
- **@ai-sdk/xai**: Grok 4系モデルに完全対応、Responses APIのサーバーサイドツールも利用可能
- v5からの自動マイグレーション: `npx @ai-sdk/codemod v6`

#### 核心機能: ToolLoopAgent

```typescript
import { ToolLoopAgent, tool } from 'ai';
import { xai } from '@ai-sdk/xai';
import { z } from 'zod';

const researchAgent = new ToolLoopAgent({
  model: xai('grok-4-1-fast-reasoning'),
  instructions: systemPrompt,
  tools: {
    rag_search: tool({
      description: '社内ナレッジベースを検索。まずこのツールで情報を探す',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => await hybridSearch(query),
    }),
    web_search: tool({
      description: 'Web検索（社内情報で不足する場合のみ使用）',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => await webSearch(query),
    }),
  },
  stopWhen: stepCountIs(5),
});
```

#### Next.js App Router統合

```typescript
// app/api/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  return createAgentUIStreamResponse({ agent: researchAgent, messages });
}

// クライアント側
import { useChat } from '@ai-sdk/react';
const { messages, input, handleSubmit } = useChat({ api: '/api/chat' });
```

#### メリット
- **Next.js/Vercelとの統合が最も自然**（同じエコシステム）
- SDK自体は無料・OSS
- **マルチプロバイダー**: xAI, Anthropic, OpenAI等をプロバイダー切り替えだけで利用
- ストリーミング対応が最も充実（`createAgentUIStreamResponse`）
- `ToolLoopAgent`で再利用可能なエージェント定義
- `@ai-sdk/xai`がGrok APIに完全対応

#### デメリット
- LangGraphほどの複雑なワークフロー定義（分岐・合流・条件ループ）はできない
- 状態の永続化は自前実装
- トレーシング・監視は別途導入が必要

#### 適合度: ★★★★★
**最有力候補**。既存のNext.js/Vercel/Supabase環境に最もフィット。段階的移行が可能。

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

| 観点 | A: LangGraph | B: Claude Agent SDK | C: Vercel AI SDK v6 | D: Grok Multi-Agent | E: OpenAI Agents |
|------|------------|---------------------|-------------------|--------------------|-----------------|
| 実装コスト | 高 | 中 | **低** | 最低 | N/A（Python） |
| API運用コスト | 中〜高 | 高 | **低〜中** | 中 | N/A |
| 柔軟性 | 高 | 最高 | **中〜高** | 低 | N/A |
| RAG統合 | 可能 | 容易 | **容易** | 制限あり | N/A |
| Next.js親和性 | 中 | 低 | **最高** | 高 | N/A |
| ストリーミング | 中 | 低 | **最高** | 高 | N/A |
| マルチプロバイダー | 高 | 中 | **最高** | 不可 | N/A |
| 過去の経験 | △撤退歴 | ○ | ○ | ○設定済み | N/A |

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

### 5.1 推奨案: Vercel AI SDK v6 + Supabase RAG

**選定理由**:
1. **既存環境を最大限活用**: Next.js App Router / Vercel / Supabase すべて既存
2. **実装コストが最小**: `@ai-sdk/xai` でGrok APIは即座に統合可能
3. **コスト削減効果が最大**: RAG優先検索で外部検索API料金を60〜80%削減
4. **段階的移行可能**: 既存のGrokClient実装と共存しながら徐々に移行
5. **マルチプロバイダー**: 将来的にClaude/OpenAIへの切替も容易
6. **LangChain撤退の教訓**: シンプルな設計で依存を最小化

### 5.2 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App Router                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │           Vercel AI SDK v6                        │ │
│  │                                                    │ │
│  │  ToolLoopAgent                                     │ │
│  │    ├── model: xai('grok-4-1-fast-reasoning')      │ │
│  │    ├── stopWhen: stepCountIs(5)                    │ │
│  │    └── tools:                                      │ │
│  │          ├── rag_search (社内ナレッジ検索)          │ │
│  │          │     └── Supabase hybrid_search()        │ │
│  │          ├── web_search (不足分のみ)               │ │
│  │          │     └── Brave/Tavily or Grok経由        │ │
│  │          ├── x_search (SNS情報)                    │ │
│  │          │     └── Grok API経由                    │ │
│  │          └── database_query (番組・チャット情報)    │ │
│  │                └── Supabase直接クエリ              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Supabase                              │ │
│  │  ├── pgvector + DiskANN (ベクトル検索)            │ │
│  │  ├── tsvector / pgroonga (全文検索)               │ │
│  │  ├── hybrid_search() RPC (ハイブリッド検索)       │ │
│  │  ├── documents / document_chunks テーブル          │ │
│  │  ├── chats / chat_messages (既存)                 │ │
│  │  └── feature_prompts (既存)                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │         ドキュメント処理パイプライン               │ │
│  │  ├── アップロード UI (管理画面)                    │ │
│  │  ├── パーサー (mammoth/exceljs/pdf-parse/vtt)     │ │
│  │  ├── チャンキング (資料タイプ別)                   │ │
│  │  └── エンベディング (Voyage AI voyage-3-large)    │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 5.3 エージェンティック・ループの動作フロー

```
ユーザー: 「マニアさんに出演してもらえそうな焼肉マニアを探して」

Step 1: LLM判断 → rag_search("焼肉マニア テレビ出演") を呼び出し
  → 社内の過去リサーチ結果がヒット（取材済み・新規マニアのリスト）

Step 2: LLM判断 → rag_search("焼肉 マニアさん 過去出演") を呼び出し
  → 過去の出演情報・議事録がヒット

Step 3: LLM判断 → 社内情報で十分と判断、回答を生成
  → 外部検索なし！コスト最小！

--- もし社内情報が不足する場合 ---

Step 3': LLM判断 → web_search("焼肉マニア インフルエンサー 2026") を呼び出し
  → 不足分のみ外部検索

Step 4: 回答を生成
```

### 5.4 既存実装からの移行パス

| 段階 | 現在 | 移行後 | 変更点 |
|------|------|--------|--------|
| LLMクライアント | `GrokClient` (直接API) | `@ai-sdk/xai` (Vercel AI SDK) | プロバイダー変更のみ |
| ストリーミング | カスタムSSEパーサー | `createAgentUIStreamResponse` | SDK標準に統一 |
| ツール呼び出し | Grokサーバーサイドツール | `ToolLoopAgent` + カスタムツール | RAG検索を優先するよう制御 |
| ナレッジ | プロンプト直接注入 | RAGハイブリッド検索 | 動的検索に変更 |
| プロンプト管理 | `feature_prompts` テーブル | そのまま維持 | 変更なし |
| チャット履歴 | Supabase | そのまま維持 | 変更なし |

---

## 6. 実装ロードマップ

### Phase 1: RAG基盤構築（優先度: 最高）
- [ ] Supabase に `documents` / `document_chunks` テーブル作成
- [ ] pgvector / pgvectorscale 拡張の有効化
- [ ] ハイブリッド検索RPC関数 `hybrid_search()` の作成
- [ ] ドキュメントパーサー実装（mammoth, exceljs, pdf-parse, vttパーサー）
- [ ] チャンキング + エンベディング生成パイプライン（Voyage AI or OpenAI）
- [ ] 管理画面でのドキュメントアップロード・管理UI
- [ ] 既存のlib/knowledge/データをRAGに移行

### Phase 2: Vercel AI SDK v6 導入 + エージェンティック化（優先度: 高）
- [ ] `@ai-sdk/xai` パッケージ導入
- [ ] `ToolLoopAgent` でリサーチエージェント定義
- [ ] カスタムツール実装（rag_search, web_search, x_search, database_query）
- [ ] `createAgentUIStreamResponse` でストリーミング統合
- [ ] 既存の `/api/llm/stream` を新アーキテクチャに移行
- [ ] 「まずRAG → 不足時のみ外部検索」のルーティングロジック

### Phase 3: コスト最適化（優先度: 中）
- [ ] 検索パターン分析・最適化（RAGヒット率のモニタリング）
- [ ] 頻出クエリのRAG結果キャッシュ（Supabase or Upstash）
- [ ] ツール呼び出し回数の上限制御・予算アラート
- [ ] 使用量ダッシュボード

### Phase 4: マルチプロバイダー・高度化（優先度: 低）
- [ ] タスク別の最適モデル自動選択（軽量タスク→Grok 4.1 Fast、高品質→Claude Sonnet等）
- [ ] フォールバック機構（API障害時に別プロバイダーへ自動切替）
- [ ] ドキュメント自動再インデックス（更新検出→再チャンキング→再エンベディング）
- [ ] RAG検索品質の継続的改善（リランキング、クエリ拡張等）

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
