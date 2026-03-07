# 主要LLM API組み込みツール比較調査

> **調査日**: 2026-03-07  
> **目的**: neta-researcher機能移植時のツール選定と代替案検討  
> **対象API**: xAI Grok, OpenAI, Anthropic Claude, Google Gemini, Perplexity

---

## 1. 概要

本ドキュメントは、neta-researcher（United Productions Web）からTeddy（AI Hub）への機能移植を検討するにあたり、主要LLM APIの組み込みツールを比較調査した結果をまとめたものです。

### 1.1 調査の背景

neta-researcherは以下のツールを使用してリサーチを行っていました：

| ツール | 用途 | 提供元 |
|--------|------|--------|
| `WebSearch` | Web検索 | MCPツール |
| `WebFetch` | 特定URLの内容取得 | MCPツール |
| `TodoWrite` | タスクリスト管理 | MCPツール |
| `gdrive_upload_file` | Google Drive連携 | MCPツール |

Teddy側のGrok実装では、これらをどう代替・実装するかを検討する必要があります。

---

## 2. xAI Grok API ツール詳細

### 2.1 現在Teddyで実装済みのツール

```typescript
// lib/llm/types.ts
export type GrokToolType = "web_search" | "x_search" | "code_execution";
```

| ツール | ツール名 | 説明 | 実装ファイル |
|--------|---------|------|-------------|
| **Web検索** | `web_search` | リアルタイムWeb検索とページ自動閲覧 | `lib/llm/clients/grok.ts` |
| **X検索** | `x_search` | X（Twitter）投稿・ユーザー・スレッド検索 | `lib/llm/clients/grok.ts` |
| **コード実行** | `code_execution` | Pythonコード実行（計算・データ分析） | `lib/llm/clients/grok.ts` |

### 2.2 Grokに存在するが未実装のツール

| ツール | ツール名 | 説明 | 優先度 |
|--------|---------|------|--------|
| **画像分析** | `view_image` | 画像の表示と分析 | 中 |
| **動画分析** | `view_x_video` | X投稿の動画表示と分析 | 低 |
| **ファイル検索** | `file_search` | ベクトルストア内のドキュメント検索 | 低 |
| **MCP連携** | `mcp_server` | リモートMCPサーバー接続 | 低 |

### 2.3 ツールパラメータ詳細

#### web_search
```typescript
{
  type: "web_search",
  allowed_domains?: string[],    // 検索対象ドメイン（最大5つ）
  excluded_domains?: string[],   // 除外ドメイン（最大5つ）
  enable_image_understanding?: boolean  // 画像理解を有効化
}
```

**重要**: Grokの`web_search`は検索だけでなく、**検索結果のページ内容を自動的に読み込んで分析**します。これはneta-researcherの`WebFetch`と似た機能ですが、以下の違いがあります：

| 点 | WebFetch（neta-researcher） | web_search（Grok） |
|-----|---------------------------|-------------------|
| **入力** | 特定のURLを直接指定 | 検索クエリ（キーワード） |
| **アクセス方法** | 直接そのURLへ | 検索経由で間接的に |
| **確実性** | URLが存在すれば必ず取得 | 検索結果に含まれない場合がある |
| **用途** | 「このページの内容を見て」 | 「〜について調べて」 |

#### x_search
```typescript
{
  type: "x_search",
  allowed_x_handles?: string[],   // 検索対象ハンドル（最大10）
  excluded_x_handles?: string[],  // 除外ハンドル（最大10）
  from_date?: string,             // 開始日（YYYY-MM-DD）
  to_date?: string,               // 終了日（YYYY-MM-DD）
  enable_image_understanding?: boolean,
  enable_video_understanding?: boolean
}
```

#### code_execution
```typescript
{
  type: "code_execution"
  // パラメータなし（シンプルなPython実行）
}
```

---

## 3. 主要LLM APIツール比較表

### 3.1 全ツール比較

| ツール機能 | xAI Grok | OpenAI | Anthropic Claude | Google Gemini | Perplexity |
|-----------|:--------:|:------:|:----------------:|:-------------:|:----------:|
| **Web検索** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **X/Twitter検索** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **コード実行** | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **ファイル検索** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **コンピューター操作** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **画像分析** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **動画分析** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **URL直接取得** | ⚠️ | ❌ | ✅ | ✅ | ⚠️ |
| **MCP連携** | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| **テキスト編集** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Bash/シェル** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **メモリ管理** | ❌ | ⚠️ | ✅ | ❌ | ⚠️ |
| **画像生成** | ❌ | ✅ | ❌ | ✅ | ❌ |

**凡例**: ✅ 対応 / ❌ 非対応 / ⚠️ 間接的・部分的

### 3.2 Web検索ツール詳細比較

| プロバイダー | ツール名 | 特徴 |
|-------------|---------|------|
| **xAI Grok** | `web_search` | ページ自動閲覧、ドメインフィルタ、画像理解 |
| **OpenAI** | `web_search` | 引用付き回答、ドメインフィルタ |
| **Anthropic** | `web_search` | 自動ソース引用、ドメインフィルタ、ユーザーロケーション対応 |
| **Google** | `googleSearch` | Google Search連携、groundingMetadata付き |
| **Perplexity** | 組み込み | リアルタイムWebクローリング、学術的引用システム |

### 3.3 コード実行ツール詳細比較

| プロバイダー | ツール名 | 環境 | 特徴 |
|-------------|---------|------|------|
| **xAI Grok** | `code_execution` | Pythonサンドボックス | データ分析、計算、可視化 |
| **OpenAI** | `code_interpreter` | Python環境 | ファイル処理、データ分析 |
| **Anthropic** | `code_execution` | Bash + ファイル操作 | セキュアなサンドボックス、永続セッション |
| **Google** | `codeExecution` | Pythonランタイム | 計算、データ可視化 |
| **Perplexity** | - | 間接的 | Pro ModeでPythonコード生成 |

### 3.4 ユニークなツール（他にない機能）

| プロバイダー | 独自ツール | 説明 |
|-------------|-----------|------|
| **xAI Grok** | `x_search` | Xプラットフォームの投稿・ユーザー・スレッド検索 |
| **xAI Grok** | `view_x_video` | X投稿の動画表示と分析 |
| **OpenAI** | `computer_use` | スクリーンショット解析、マウス/キーボード制御 |
| **OpenAI** | `image_generation` | 画像生成機能 |
| **Anthropic** | `web_fetch` | 特定URLからのコンテンツ直接取得 |
| **Anthropic** | `computer` | デスクトップ自動化（スクリーンショット、マウス、キーボード） |
| **Anthropic** | `text_editor` | テキストファイルの表示・編集（view, str_replace, create, insert） |
| **Anthropic** | `bash` | シェルコマンド実行（永続的Bashセッション） |
| **Anthropic** | `memory` | 会話横断での情報保存・取得 |
| **Google** | `urlContext` | 特定Webページの内容抽出・分析 |

---

## 4. neta-researcher移植時の対応方針

### 4.1 ツール代替マトリックス

| neta-researcher機能 | Grokでの代替案 | 実装難易度 | 備考 |
|--------------------|---------------|-----------|------|
| **Web検索** | `web_search` | 低 | 既に実装済み |
| **WebFetch（URL直接取得）** | `web_search` or 自前fetch | 中 | 検索経由になるが実質同機能 |
| **X検索** | `x_search` | 低 | United側にはない追加価値 |
| **コード実行** | `code_execution` | 低 | 既に実装済み |
| **タスク管理（TodoWrite）** | **フロントエンド実装** | 中 | Grokには相当機能がない |
| **Google Drive連携** | `mcp_server` or API直接 | 高 | MCPサーバー実装が必要 |

### 4.2 WebFetch移植の詳細

#### 問題点
neta-researcherのプロンプトに「このURLを開いて」という指示がある場合、Grokではそのままでは動作しない可能性があります。

#### 対応案

**案1: ワークフロー変更（推奨）**
```markdown
変更前: 「https://example.com/article の内容を確認して」
変更後: 「example.comの記事について調べて」

→ Grokのweb_searchが自動的に検索・閲覧して分析
```

**案2: 自前実装（特定URLが必須の場合）**
```typescript
// lib/tools/web-fetch.ts
import * as cheerio from 'cheerio';

export async function fetchUrlContent(url: string): Promise<string> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  return $('body').text().trim().slice(0, 10000);
}
```

**案3: ハイブリッド**
- まずGrokの`web_search`で検索
- 特定URLが必要な場合は自前でfetch

### 4.3 タスクリストUI（TodoWrite代替）詳細設計

Grokにはタスク管理ツールが存在しません。**AI連携型フロントエンドタスク管理**として実装します。

#### 4.3.1 実装方針

```
┌─────────────────────────────────────────────────────────┐
│  AIがタスクを生成・更新                                    │
│       ↓ SSEイベントで通知                                  │
│  フロントエンドでタスクリスト表示・編集                    │
│       ↓ ユーザーが確認・手動編集可能                       │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.2 データモデル（Prisma）

```prisma
// prisma/schema.prisma

model Task {
  id          String    @id @default(cuid())
  sessionId   String    // チャットセッションID
  externalId  String?   // AIが生成したタスクID（任意）
  content     String    // タスク内容
  status      TaskStatus @default(PENDING)
  order       Int       // 表示順
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([sessionId])
}

enum TaskStatus {
  PENDING      // 未着手
  IN_PROGRESS  // 進行中
  COMPLETED    // 完了
  CANCELLED    // キャンセル
}
```

#### 4.3.3 型定義

```typescript
// lib/task/types.ts

export interface Task {
  id: string;
  externalId?: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  order: number;
  createdAt: Date;
}

export interface TaskEvent {
  type: 'task_create' | 'task_update' | 'task_complete' | 'task_list';
  tasks: Task[];
  message?: string;  // AIからのメッセージ（例：「〜を調査しています」）
}
```

#### 4.3.4 SSEイベント拡張

```typescript
// lib/llm/types.ts に追加

export type SSEEvent =
  | { type: 'start' }
  | { type: 'tool_call'; ... }
  | { type: 'content'; delta: string }
  | { type: 'task'; event: TaskEvent }  // ← 追加
  | { type: 'done'; usage: {...} }
  | ...;
```

#### 4.3.5 フロントエンド実装ファイル

```typescript
// 新規作成ファイル
- lib/task/types.ts             // タスク型定義
- lib/task/api.ts               // タスクAPIクライアント
- app/api/tasks/route.ts        // タスクCRUD API
- components/chat/TaskList.tsx  // タスクリストUI
- components/chat/TaskItem.tsx  // 個別タスクアイテム
- hooks/useTasks.ts             // タスク状態管理フック
```

#### 4.3.6 プロンプト調整

```markdown
## タスク管理
あなたはリサーチ計画を立て、タスクを作成・管理できます。
タスクの作成・更新時は必ず以下の形式で出力してください：

<task_action>
{
  "action": "create|update|complete",
  "tasks": [
    {
      "externalId": "task_001",
      "content": "〜を調査する",
      "status": "in_progress"
    }
  ],
  "message": "〜を調査しています"
}
</task_action>

### タスクステータス
- pending: 未着手
- in_progress: 進行中  
- completed: 完了

### ルール
1. リサーチ計画を立てたら即座にタスクを作成
2. 各タスク開始時にstatusを"in_progress"に更新
3. タスク完了時にstatusを"completed"に更新
4. 進捗状況をユーザーに伝える
```

#### 4.3.7 UIイメージ

```
┌─────────────────────────────────────────┐
│ チャット画面                            │
├─────────────────────────────────────────┤
│                                         │
│ 🤖 AI                                   │
│ 以下のリサーチ計画で進めます：            │
│                                         │
│ ┌─ タスクリスト ───────────────────┐   │
│ │ ☑️ 1. テーマの背景調査（完了）    │   │
│ │ 🔄 2. 類似企画の調査（進行中）    │   │
│ │ ⬜ 3. 出演者候補のリサーチ        │   │
│ │ ⬜ 4. ネタ帳の作成               │   │
│ │                                   │   │
│ │ [+ タスク追加]  [一括編集]        │   │
│ └───────────────────────────────────┘   │
│                                         │
│ 現在「類似企画の調査」を進めています...  │
│                                         │
├─────────────────────────────────────────┤
│ [入力欄]                      [送信]   │
└─────────────────────────────────────────┘
```

#### 4.3.8 実装ステップ

| 順番 | 作業内容 | 工数見積 |
|------|---------|---------|
| 1 | Prismaスキーマ追加・マイグレーション | 30分 |
| 2 | Task型定義・APIエンドポイント作成 | 1時間 |
| 3 | SSEイベント'task'タイプ追加 | 30分 |
| 4 | TaskList UIコンポーネント作成 | 2時間 |
| 5 | useTasksフック実装 | 1時間 |
| 6 | プロンプト調整 | 30分 |
| **合計** | | **5.5時間** |

---

## 5. 推奨実装方針

### 5.1 段階的実装プラン

```
Phase 1: 基本機能（最小限）
├── ✅ web_search（既存）
├── ✅ x_search（既存）
├── ✅ code_execution（既存）
├── プロンプト調整（WebFetch→web_search）
└── シンプルなリサーチ → レポート生成フロー

Phase 2: 機能強化
├── タスクリストUI（AI連携型フロントエンド管理）← 詳細設計は4.3節参照
├── Google Drive連携API
└── レポートテンプレート改善

Phase 3: 高度な機能（将来対応）
├── view_image（画像分析）
├── file_search（ベクトルストア）
└── mcp_server（MCP連携）
```

### 5.2 プロンプト設計案

**新規キー**: `NEW_PLANNING` または `PROPOSAL` を拡張

```markdown
## 役割
あなたはTV番組制作のプロフェッショナルなリサーチアシスタントです。
番組デスクやチーフADのような、頼れるパートナーとして動作します。

## 利用可能なツール
- web_search: Web検索と自動ページ閲覧
- x_search: X（Twitter）検索
- code_execution: Pythonコード実行

## 特徴
- 常に「視聴率」「尺」「画になるか」「コンプライアンス」を意識
- 業界用語を自然に交える（裏取り、完パケ、尺、テッパン等）
- 丁寧だが、過度にへりくだらず、プロとして対等に提案

## ワークフロー
1. リサーチ計画を立て、ユーザーに提示
2. web_searchツールを使って徹底リサーチ
3. 必要に応じてx_searchでSNS情報も収集
4. code_executionでデータ分析・可視化
5. ネタ帳（リサーチレポート）を作成

## 出力形式
[neta-researcherのレポート形式を参考に]
```

---

## 6. 結論

### 6.1 移植の可否

| 項目 | 評価 | 備考 |
|------|------|------|
| **プロンプト移植** | ✅ 可能 | コンテンツは流用可能、ツール呼び出し部分を調整必要 |
| **機能移植** | ⚠️ 一部制約あり | タスク管理UI、Google Drive連携が必要 |
| **ワークフロー移植** | ✅ 可能 | Phase 1-5の流れはそのまま適用可能 |

### 6.2 主要な課題と対応

| 課題 | 対応方針 |
|------|---------|
| **TodoWriteツールがない** | フロントエンドでタスクリストUIを実装 |
| **WebFetch相当がない** | プロンプトを「〜について調べて」形式に変更 |
| **Google Drive連携がない** | MCPサーバー実装 or Google Drive API直接呼び出し |

### 6.3 推奨事項

- **プロンプトキー**: `PROPOSAL` を拡張するか、`NEW_PLANNING` を新設
- **実装順序**: 
  1. プロンプト調整（WebFetch→web_search）
  2. タスクリストUI実装
  3. Google Drive連携
- **ユーザーフロー**: 「新規企画立案」Sidebarメニューから開始

---

## 7. 参考リンク

### 7.1 xAI Grok関連

- **Teddy LLM実装**: `lib/llm/clients/grok.ts`
- **LLM型定義**: `lib/llm/types.ts`
- **ツール設定**: `lib/tools/config.ts`
- **xAI公式ドキュメント**: https://docs.x.ai/docs/guides/tools/overview

### 7.2 Teddy関連ファイル

- **システムプロンプト管理**: `lib/prompts/system-prompt.ts`
- **プロンプトDB操作**: `lib/prompts/db/crud.ts`
- **クライアントメモリ**: `lib/llm/memory/client-memory.ts`
- **リサーチサービス**: `lib/research/service.ts`
- **企画サービス**: `lib/proposal/service.ts`
- **Google Drive連携**: `lib/google/drive.ts`

### 7.3 その他LLM APIドキュメント

- **OpenAI Responses API**: https://developers.openai.com/api/docs/guides/migrate-to-responses/
- **Anthropic Claude Tools**: https://reference.langchain.com/javascript/langchain-anthropic/tools
- **Google Gemini API**: https://www.promptfoo.dev/docs/providers/google/
- **Perplexity API**: https://techboosted.co.uk/perplexity-api-pricing-models/

---

## 8. 付録: 外部検索API詳細比較

xAIの組み込み`web_search`以外に検討可能な外部検索APIを比較する。

### 8.1 外部検索API比較表

| API | タイプ | 料金 | 強み | 弱み | Teddy向き |
|-----|--------|------|------|------|----------|
| **xAI web_search** | 組み込み | $5/1000回（最大） | X検索と統合、実装シンプル | 検索品質は標準的 | ⭐⭐⭐ |
| **Tavily** | AIネイティブ | $8/1000回 | 引用充実、LangChain統合 | X検索なし | ⭐⭐⭐ |
| **SerpAPI** | 伝統的SERP | $75/5000回（$15/1000） | 40+エンジン、信頼性 | X検索なし、高価 | ⭐⭐ |
| **Exa** | セマンティック | $1.50/1000回 | 意味検索、RAG最適 | X検索なし | ⭐⭐ |
| **Firecrawl** | AIネイティブ | $83/100k credits | 検索+スクレイピング統合 | X検索なし | ⭐⭐ |
| **Brave Search** | 独立インデックス | $5/1000回 | プライバシー重視 | X検索なし | ⭐⭐ |

### 8.2 詳細分析

#### xAI web_search（組み込み）

```typescript
// メリット: X検索との統合
const tools = [
  { type: 'web_search' },
  { type: 'x_search' },  // 唯一の選択肢
];

// 実装がシンプル（1つのAPI）
const response = await xai.responses.create({
  model: 'grok-4-1-fast-reasoning',
  tools: ['web_search', 'x_search', 'code_execution'],
  input: messages,
});
```

**評価**:
- ✅ X検索と統合できる
- ✅ 実装が最もシンプル
- ✅ レイテンシ低い（1リクエスト）
- ⚠️ 検索品質は標準的

#### Tavily（外部API）

```typescript
// Tavily → 検索結果 → xAIで生成
const searchResult = await tavily.search({
  query: '最新のAIニュース',
  search_depth: 'advanced',
  include_answer: true,
});

const response = await xai.chat({
  messages: [
    { role: 'system', content: '以下の検索結果を基に回答してください' },
    { role: 'user', content: searchResult.answer },
  ],
});
```

**評価**:
- ✅ エビデンス最充実
- ✅ 引用が自動で付く
- ❌ X検索なし
- ❌ 2段階リクエスト（レイテンシ増）

### 8.3 結論: xAI web_searchを採用

**理由**:

| 観点 | 評価 |
|------|------|
| **X検索との統合** | 🏆 外部APIでは不可能 |
| **実装シンプルさ** | 1つのAPIで完結 |
| **レイテンシ** | 最小（1リクエスト） |
| **コスト** | ツール料金のみ |
| **メンテナンス** | 最低限 |

**検索品質の懸念への対応**:

```
xAI web_searchの品質が標準的でも、
X検索との組み合わせで十分な価値を提供できる。

→ Web検索でエビデンス収集
→ X検索でリアルタイム動向確認
→ コード実行でデータ分析
```

**将来の切り替え検討時期**:

| 状況 | 対応 |
|------|------|
| 検索品質で不満が出た場合 | TavilyやExaとの併用を検討 |
| X検索が不要になった場合 | 外部APIへの移行を検討 |
| コスト削減が必要な場合 | 検索結果のキャッシュ化を検討 |

---

## 9. 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2026-03-07 | 初版作成 |
| 2026-03-07 | 外部検索API比較（付録8）を追加 |
