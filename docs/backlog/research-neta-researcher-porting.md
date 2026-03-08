# ネタ企画作家（neta-researcher）調査結果ドキュメント

> **調査対象**: United Productions Web の neta-researcher モード
> **調査日**: 2026-03-03
> **目的**: Teddy（AI Hub）への新規企画立案機能移植の検討

---

## 1. 概要

### 1.1 neta-researcher とは

TV番組制作のプロフェッショナルリサーチャーとして動作するAIエージェントモード。
「番組デスクやチーフADのような、頼れるパートナー」をキャラクター設定とし、ネタ帳（リサーチレポート）の作成を行う。

### 1.2 主要機能

| 機能 | 説明 |
|------|------|
| **ネタリサーチ** | テーマに基づいた徹底調査（Web検索、詳細情報取得） |
| **ネタ帳作成** | 会議資料として使えるリサーチレポートの生成 |
| **画像収集** | 各テーマごとに1-3枚の画像URLを収集 |
| **インフォグラフィック生成** | Pythonスクリプトによる視覚的資料作成（オプション） |
| **Google Drive連携** | 成果物の保存・読み込み |

---

## 2. アーキテクチャ比較

### 2.1 United Productions Web（neta-researcher側）

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                         │
│  - Agent Mode Selector                                      │
│  - Chat UI with file attachments                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/chat/completions
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes                                         │
│  - /api/chat/completions → Agent API Proxy                  │
│  - /api/agent/sessions/[id]/stream → SSE Proxy              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Claude Code Agent API (外部サービス: localhost:8230)        │
│  - Session管理                                              │
│  - ツール実行 (WebSearch, WebFetch, TodoWrite等)            │
│  - MCP連携 (Google Drive)                                   │
└─────────────────────────────────────────────────────────────┘
```

#### Claude Code Agent API とは？

**Claude Code OpenAI API Wrapper**（通称: Claude Code Agent API）は、AnthropicのClaude Code CLIを**OpenAI API互換の形式**で使えるようにするラッパーサーバーです。

| 項目 | 内容 |
|------|------|
| **実装** | FastAPI（Python） |
| **公式SDK** | `claude-agent-sdk` v0.1.6 |
| **提供機能** | OpenAI互換の `/v1/chat/completions` エンドポイント |
| **ポート** | デフォルト 8230 |
| **ツール** | WebSearch, WebFetch, TodoWrite, Bash, gdrive_upload_file 等 |

**仕組み**:
1. Next.jsアプリから `/api/chat/completions` へリクエスト
2. Next.jsがAgent API（`localhost:8230`）をProxy
3. Agent APIがClaude Agent SDKを使用してClaude Code CLIを実行
4. ツール使用時はSSEでリアルタイムにイベントをストリーミング

**リポジトリ**: `reference/up-web-legacy/agent/` に含まれています

**該当ファイル**:
- モード定義: `reference/up-web-legacy/up_web/lib/modes/prompts/neta-researcher.ts`
- API Proxy: `reference/up-web-legacy/up_web/app/api/chat/completions/route.ts`
- SSE Proxy: `reference/up-web-legacy/up_web/app/api/agent/sessions/[sessionId]/stream/route.ts`
- Agent APIクライアント: `reference/up-web-legacy/up_web/lib/agent/types.ts`

**重要な実装詳細**:
- Agent APIからのSSEを**Vercel AI SDK Data Stream format**に変換
  - `todo_update` → `2:{"type":"todo_update",...}`
  - `file_created` → `2:{"type":"file_created",...}`
  - `gdrive_file_created` → `2:{"type":"gdrive_file_created",...}`
  - コンテンツ → `0:"content"`
- Session再接続: `/api/agent/sessions/[id]/stream?since_id=` でバッファリング済みイベントを再取得

### 2.2 Teddy（AI Hub）現在の構成

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                         │
│  - Feature Selector (Sidebar)                               │
│  - Chat UI                                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/llm/stream
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes                                         │
│  - /api/llm/stream → GrokClient直接呼び出し                 │
│  - SSEストリーミングレスポンス                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ xAI Responses API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  xAI (Grok)                                                 │
│  - web_search, x_search, code_execution ツール              │
└─────────────────────────────────────────────────────────────┘
```

**該当ファイル**:
- LLMストリーミングAPI: `app/api/llm/stream/route.ts`
- Grokクライアント: `lib/llm/clients/grok.ts`
- LLMファクトリ: `lib/llm/factory.ts`
- SSEパーサー: `lib/llm/sse-parser.ts`
- チャット設定: `lib/chat/chat-config.ts`
- エージェント定義: `lib/chat/agents.ts`

**重要な実装詳細**:
- **シンプルなSSEフォーマット**: `data: {"type":"content",...}\n\n`
- カスタムイベントタイプ: `start`, `tool_call`, `content`, `citation`, `done`, `error`, `status`
- **ClientMemory**: ブラウザ側で会話履歴を管理（ページリロードで消失）
- **システムプロンプト**: `buildSystemPrompt()` で番組情報 + 機能プロンプトを動的構築

---

## 3. 技術的違いの詳細

### 3.1 LLM/ツール連携

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **LLMプロバイダー** | Claude (Anthropic) | xAI Grok |
| **ツール実行方式** | MCP (Model Context Protocol) | xAI Responses API 組み込みツール |
| **Web検索** | WebSearchツール (自前) | web_search (xAI組み込み) |
| **ファイル保存** | gdrive_upload_file (MCP) | 未実装（検討中） |
| **タスク管理** | TodoWriteツール (自前) | 未実装 |
| **画像生成** | Pythonスクリプト + gdrive_upload | 未実装 |

**該当ファイル**:
- LLM設定: `lib/llm/config.ts`
- LLM型定義: `lib/llm/types.ts`
- LLM定数: `lib/llm/constants.ts`
- ツール設定: `lib/tools/config.ts`
- Google Drive連携: `lib/google/drive.ts`
- Drive API: `app/api/drive/files/route.ts`, `app/api/drive/download/route.ts`

### 3.2 プロンプト管理

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **管理方式** | コード内定義 (lib/modes/prompts/*.ts) | DB管理 (SystemPromptテーブル) + フォールバック |
| **プロンプト構成** | モジュール式（CORE_RULES + Mode + Google Drive + Infographic） | 単一プロンプト（番組情報 + 機能プロンプト） |
| **バージョン管理** | なし（コード管理） | あり（SystemPromptVersionテーブル） |
| **動的切り替え** | コード変更が必要 | DB更新のみで反映 |

**該当ファイル**:
- システムプロンプト管理: `lib/prompts/system-prompt.ts`
- プロンプトDB操作: `lib/prompts/db/crud.ts`
- プロンプト型定義: `lib/prompts/db/types.ts`
- プロンプトキー定義: `lib/prompts/constants/keys.ts`
- プロンプト定数: `lib/prompts/constants/prompts.ts`
- フォールバックプロンプト: `prompts/meeting-format.ts`, `prompts/transcript-format.ts`
- プロンプト管理API: `app/api/prompts/route.ts`, `app/api/admin/prompts/route.ts`
- リサーチプロンプト: `lib/research/prompts.ts`

### 3.3 セッション/ストリーミング

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **セッション管理** | 外部Agent APIが管理 | ClientMemory（ブラウザ側） |
| **ストリーミング** | Agent API SSE → 変換 → Vercel AI SDK | 直接xAI SSE → シンプルSSE |
| **カスタムイベント** | todo_update, file_created, gdrive_file_created | tool_call, citation, status |
| **再接続** | セッションバッファ経由の再接続対応 | 未実装（ページリロードで消失） |

**該当ファイル**:
- クライアントメモリ: `lib/llm/memory/client-memory.ts`
- メモリ型定義: `lib/llm/memory/types.ts`
- LLMストリーミングAPI: `app/api/llm/stream/route.ts`
- フォローアップAPI: `app/api/llm/follow-up/route.ts`
- チャット履歴API: `app/api/chat/history/route.ts`
- チャット機能API: `app/api/chat/feature/route.ts`
- SSEパーサー: `lib/llm/sse-parser.ts`
- メッセージコンポーネント: `components/chat/messages/`

### 3.4 チャットメモリ・要約機能の比較

#### メモリ管理

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **メモリ方式** | セッションベース（Agent API管理） | クライアントメモリ（ブラウザストレージ） |
| **永続化** | セッションファイル（Claude Code固有） | 未実装（ページリロードで消失） |
| **履歴取得** | Agent API経由で履歴再取得可能 | 再読み込み時に履歴が失われる |
| **コンテキスト制限** | Agent APIが自動管理 | 手動での履歴切り詰めが必要 |

#### 要約機能

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **自動要約** | なし（Claudeの長文コンテキストに依存） | なし（手動での実装が必要） |
| **会話圧縮** | 長文会話でもそのまま処理 | トークン制限に達したら履歴切り詰め |
| **要約タイミング** | 不要（100K+トークン対応） | 必要（手動実装が必要） |
| **要約プロンプト** | なし | 未実装 |

#### 移植時の課題

```
┌─────────────────────────────────────────────────────────────┐
│  neta-researcher の会話フロー（長時間・多ターン想定）         │
├─────────────────────────────────────────────────────────────┤
│  1. Phase 1-5 の長期リサーチセッション                        │
│  2. 多数のWeb検索結果の蓄積                                   │
│  3. タスクリストの状態管理                                    │
│  4. 最終的なレポート生成（全コンテキストを使用）              │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Teddy への移植時の対応                                      │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 課題: ClientMemoryはページリロードで消失                  │
│                                                             │
│  ✅ 対応案1: DBに会話履歴を永続化                             │
│     - Messageテーブルに保存                                  │
│     - セッション復帰時に履歴を復元                            │
│                                                             │
│  ✅ 対応案2: 要約機能の実装                                   │
│     - 一定ターンごとに要約を生成                              │
│     - 古いメッセージを圧縮して保存                            │
│                                                             │
│  ✅ 対応案3: ステートレス設計への変更                         │
│     - 中間成果物をGoogle Driveに都度保存                      │
│     - セッションは短期的にのみ使用                            │
└─────────────────────────────────────────────────────────────┘
```

#### 推奨するメモリ戦略

| 戦略 | 説明 | 優先度 |
|------|------|--------|
| **DB永続化** | Messageテーブルに履歴を保存し、セッション復帰時に復元 | 高 |
| **セッション分離** | 企画ごとに新しいセッションを開始（履歴クリア） | 高 |
| **中間成果物の保存** | リサーチ途中経過をGoogle Driveに自動保存 | 中 |
| **要約生成** | 長時間セッションの場合、定期的に要約を生成 | 低（将来対応） |

**該当ファイル**:
- 要約API: `app/api/llm/summarize/route.ts`
- 要約メッセージコンポーネント: `components/chat/messages/SummarizationMessage.tsx`
- Prismaスキーマ（Messageテーブル）: `prisma/schema.prisma`

---

## 4. neta-researcher プロンプト詳細

### 4.1 プロンプト構成

```
┌─────────────────────────────────────────────────────────────┐
│  最終的なシステムプロンプト                                  │
├─────────────────────────────────────────────────────────────┤
│  1. CORE_RULES（絶対厳守ルール）                            │
│     - ローカルファイル編集禁止                              │
│     - タスクリスト必須                                      │
│     - 成果物はGoogle Driveに保存                            │
├─────────────────────────────────────────────────────────────┤
│  2. neta-researcherMode.systemPrompt                        │
│     - キャラクター設定（Persona）                           │
│     - 自律的思考と行動                                      │
│     - 利用可能なツール                                      │
│     - 戦略的ワークフロー（Phase 1-5）                       │
│     - ネタ帳のFormat                                        │
├─────────────────────────────────────────────────────────────┤
│  3. File References（添付ファイル情報）                     │
├─────────────────────────────────────────────────────────────┤
│  4. GOOGLE_DRIVE_MCP_INSTRUCTIONS                           │
│     - ファイル読み込み/保存方法                             │
│     - gdrive_read_file / gdrive_upload_file の使い方        │
├─────────────────────────────────────────────────────────────┤
│  5. INFOGRAPHIC_INSTRUCTIONS                                │
│     - Pythonスクリプトによる画像生成                        │
└─────────────────────────────────────────────────────────────┘
```

**該当ファイル**:
- システムプロンプト管理: `lib/prompts/system-prompt.ts`
- プロンプトDB: `lib/prompts/db/crud.ts`, `lib/prompts/db/types.ts`
- 番組情報データ: `lib/knowledge/programs.ts`, `lib/knowledge/programs-detailed-data.ts`
- Google Drive連携: `lib/google/drive.ts`

### 4.2 ワークフロー（Phase 1-5）

| Phase | 内容 | 使用ツール | Teddy移植時の課題 |
|-------|------|-----------|------------------|
| **Phase 1** | コンテキスト取得・コンセプト生成 | AskUserQuestion | AskUserQuestionツールがない |
| **Phase 2** | リサーチ計画策定 | WebSearch, TodoWrite | TodoWriteツールがない |
| **Phase 3** | 徹底リサーチ（Deep Dive） | WebSearch, WebFetch, TodoWrite | WebFetch相当が必要 |
| **Phase 4** | ネタ帳提出 | gdrive_upload_file | Google Drive連携が必要 |
| **Phase 5** | インフォグラフィック生成（オプション） | Bash + gdrive_upload_file | 画像生成基盤が必要 |

**該当ファイル**:
- リサーチサービス: `lib/research/service.ts`
- リサーチ設定: `lib/research/config.ts`
- リサーチプロンプト: `lib/research/prompts.ts`
- リサーチAPI: `app/api/research/route.ts`
- 企画サービス: `lib/proposal/service.ts`
- 企画API: `app/api/proposal/route.ts`
- ツール設定: `lib/tools/config.ts`
- **参考: neta-researcherプロンプト**: `reference/up-web-legacy/up_web/lib/modes/prompts/neta-researcher.ts`

### 4.3 画像収集・インフォグラフィック生成の詳細

#### 画像収集（Phase 3）

**実装方法**:
```
WebSearch で画像を検索 → 画像URLを取得 → レポートに埋め込み
```

**詳細**:
- Phase 3（徹底リサーチ）の「品質基準」に明記
- 「深掘りするテーマごとに最低1-3枚の画像URLを取得」
- レポートフォーマット内に `![Image Description](画像URL)` として埋め込み

**プロンプト内の記述**:
```markdown
- **画像取得**: 深掘りするテーマごとに最低1-3枚の画像URLを取得する。
  レポートを読む人が内容をイメージしやすいようにする。
- **画作り**: 映像化できるか？画像はあるか？
```

#### インフォグラフィック生成（Phase 5）

**実装方法**:
```
BashツールでPythonスクリプトを実行 → 画像生成 → gdrive_upload_fileで保存
```

**詳細**:
- Phase 4完了後、ユーザーに確認して実行（オプション）
- Pythonスクリプト（matplotlib, seaborn等）でデータ可視化
- 生成した画像をGoogle Driveに保存

**プロンプト内の記述**:
```markdown
### Phase 5: インフォグラフィック生成 (Visual Enhancement) - OPTION
- **Phase 4完了後、UserにInfographicを作成するか質問する**
- 各主要インサイトについて、インフォグラフィックを生成
- 生成した画像は `gdrive_upload_file` でGoogle Driveに保存
```

**Teddyでの代替案**:
| 機能 | neta-researcher | Teddy代替案 |
|------|----------------|-------------|
| 画像収集 | WebSearchで画像URL取得 | 現状維持（Web検索結果に画像含まれる）|
| インフォグラフィック | Pythonスクリプト実行 | **後回し**（code_executionで将来的に可能）|

**参照ファイル**:
- neta-researcherプロンプト: `reference/up-web-legacy/up_web/lib/modes/prompts/neta-researcher.ts`

### 4.4 最重要ルール（neta-researcher固有）

```
🚨 計画したら即実行
- 「〜を調べます。しばらくお待ちください」→ 禁止
- 「〜を調べます」→ 即座にWebSearchを実行（同じメッセージ内）
```

これは**Claude Codeの特性**を活かした設計で、ユーザー確認を待たずに自律的に動作する。

---

## 5. 移植に必要な実装

### 5.1 必須機能

| 機能 | 優先度 | 実装方針 |
|------|--------|---------|
| **Google Drive連携** | 高 | MCPではなく、Google Drive API直接呼び出し |
| **タスクリストUI** | 高 | フロントエンドでTodo管理（AIではなくUI側） |
| **WebFetch相当** | 中 | URLコンテンツ取得（fetch + cheerio等） |
| **レポート自動保存** | 高 | 生成後自動的にGoogle Driveに保存 |

**該当ファイル**:
- Google Drive連携: `lib/google/drive.ts`
- DriveファイルAPI: `app/api/drive/files/route.ts`
- DriveダウンロードAPI: `app/api/drive/download/route.ts`
- ドキュメントパーサー: `lib/parsers/document.ts`
- ファイルアップロードAPI: `app/api/upload/route.ts`
- ファイルパーサー: `lib/upload/file-parser.ts`

### 5.2 オプション機能

| 機能 | 優先度 | 実装方針 |
|------|--------|---------|
| **インフォグラフィック生成** | 低 | Pythonスクリプト or Replicate API等 |
| **Phase 1の詳細ヒアリング** | 中 | 現在の「出演者リサーチ」等と同様の形式で入力 |

**該当ファイル**:
- エクスポート機能: `lib/export/index.ts`
- Word生成: `lib/export/word-generator.ts`
- Markdownパーサー: `lib/export/markdown-parser.ts`
- WordエクスポートAPI: `app/api/export/word/route.ts`

### 5.3 プロンプト調整が必要な点

| 項目 | 現状（Claude） | 調整案（Grok） |
|------|---------------|---------------|
| **ツール名** | WebSearch, WebFetch, TodoWrite等 | web_search（組み込み） |
| **即実行指示** | 「同じメッセージ内でツールを呼び出す」 | Grokは自律的にツールを使うため、強調不要 |
| **タスク管理** | TodoWriteでAIが管理 | AI連携型フロントエンド管理（詳細は5.4節） |
| **ファイル保存** | gdrive_upload_file | 生成後にAPI経由で保存（AIに任せない） |

### 5.4 タスクリストUI（TodoWrite代替）詳細設計

Grokにはタスク管理ツールが存在しません。**AI連携型フロントエンドタスク管理**として実装します。

#### 実装方針

```
┌─────────────────────────────────────────────────────────┐
│  AIがタスクを生成・更新                                    │
│       ↓ SSEイベントで通知                                  │
│  フロントエンドでタスクリスト表示・編集                    │
│       ↓ ユーザーが確認・手動編集可能                       │
└─────────────────────────────────────────────────────────┘
```

#### データモデル（Prisma）

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

**該当ファイル**: `prisma/schema.prisma`

#### 型定義

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

**該当ファイル**: `lib/task/types.ts`

#### SSEイベント拡張

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

**該当ファイル**: `lib/llm/types.ts`

#### フロントエンド実装ファイル

```typescript
// 新規作成ファイル一覧
- lib/task/types.ts             // タスク型定義
- lib/task/api.ts               // タスクAPIクライアント
- app/api/tasks/route.ts        // タスクCRUD API
- components/chat/TaskList.tsx  // タスクリストUI
- components/chat/TaskItem.tsx  // 個別タスクアイテム
- hooks/useTasks.ts             // タスク状態管理フック
```

#### プロンプト調整

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

#### UIイメージ

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

#### 実装ステップ

| 順番 | 作業内容 | 工数見積 |
|------|---------|---------|
| 1 | Prismaスキーマ追加・マイグレーション | 30分 |
| 2 | Task型定義・APIエンドポイント作成 | 1時間 |
| 3 | SSEイベント'task'タイプ追加 | 30分 |
| 4 | TaskList UIコンポーネント作成 | 2時間 |
| 5 | useTasksフック実装 | 1時間 |
| 6 | プロンプト調整 | 30分 |
| **合計** | | **5.5時間** |

**該当ファイル**:
- システムプロンプト: `lib/prompts/system-prompt.ts`
- プロンプト定数: `lib/prompts/constants/prompts.ts`
- ツール設定: `lib/tools/config.ts`
- LLM設定: `lib/llm/config.ts`

---

## 6. 推奨される移植アプローチ

### 6.0 スコープ調整（重要）

neta-researcherの全機能を移植するのではなく、**最小限の機能から段階的に実装**します。

#### 初回リリーススコープ（実装対象）

| 機能 | 実装 | 備考 |
|------|------|------|
| **ネタリサーチ** | ✅ | Web検索 + X検索で実現 |
| **ネタ帳作成** | ✅ | マークダウン形式のリサーチレポート |
| **タスクリストUI** | ✅ | 進捗可視化のため必須 |

#### 後回し（将来対応）

| 機能 | 理由 |
|------|------|
| **画像収集** | 各テーマごとの画像URL収集は手動または別途検討 |
| **インフォグラフィック生成** | Pythonスクリプト実行は現段階では優先度低 |
| **Google Drive連携** | 成果物保存はダウンロード機能で代替可能 |

```
┌─────────────────────────────────────────────────────────────┐
│  neta-researcher 全機能                                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ ネタリサーチ       → Web/X検索で実現                    │
│  ✅ ネタ帳作成         → マークダウンレポート               │
│  ⏸️ 画像収集           → 後回し（将来対応）                │
│  ⏸️ インフォグラフィック → 後回し（将来対応）              │
│  ⏸️ Google Drive連携   → 後回し（ダウンロードで代替）       │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 段階的実装プラン

```
Phase 1: 基本機能（最小限）
├── プロンプトDB登録（PROPOSALキーで再利用 or NEW_PLANNINGキー新設）
├── タスクリストUI実装
└── シンプルなリサーチ → レポート生成フロー

Phase 2: 機能強化
├── WebFetch相当の詳細情報取得
├── レポートテンプレート改善
└── エクスポート機能強化

Phase 3: 高度な機能（将来対応）
├── 画像収集・表示機能
├── インフォグラフィック生成
└── Google Drive連携
```

### 6.2 プロンプト設計案

**新規キー**: `NEW_PLANNING` または `PROPOSAL` を拡張

```markdown
## 役割
あなたはTV番組制作のプロフェッショナルなリサーチアシスタントです。
番組デスクやチーフADのような、頼れるパートナーとして動作します。

## 特徴
- 常に「視聴率」「尺」「画になるか」「コンプライアンス」を意識
- 業界用語を自然に交える（裏取り、完パケ、尺、テッパン等）
- 丁寧だが、過度にへりくだらず、プロとして対等に提案

## ワークフロー
1. リサーチ計画を立て、ユーザーに提示
2. web_searchツールを使って徹底リサーチ
3. ネタ帳（リサーチレポート）を作成
4. 指定された形式で出力

## 出力形式
[neta-researcherのレポート形式を参考に]
```

**該当ファイル**:
- プロンプトキー定義: `lib/prompts/constants/keys.ts`
- 既存プロンプト: `prompts/meeting-format.ts`, `prompts/transcript-format.ts`
- プロンプトDBシード: `lib/prompts/db/seed.ts`
- プロンプト管理スクリプト: `prompt-tuning/scripts/init-session.mjs`, `prompt-tuning/scripts/approve.mjs`

---

## 7. 結論

### 7.1 移植の可否

| 項目 | 評価 | 備考 |
|------|------|------|
| **プロンプト移植** | ✅ 可能 | コンテンツは流用可能、ツール呼び出し部分を調整必要 |
| **機能移植** | ⚠️ 一部制約あり | Google Drive連携、タスク管理UIが必要 |
| **ワークフロー移植** | ✅ 可能 | Phase 1-5の流れはそのまま適用可能 |

### 7.2 主要な課題

1. **ツールの違い**: ClaudeのMCPツール vs Grokの組み込みツール
2. **ファイル保存**: Google Drive連携の新規実装が必要
3. **タスク管理**: AI任せではなく、UI側で管理する設計変更

### 7.3 推奨事項

- **プロンプトキー**: `PROPOSAL` を拡張するか、`NEW_PLANNING` を新設
- **実装順序**: Google Drive連携 → プロンプト調整 → UI実装
- **ユーザーフロー**: 「新規企画立案」Sidebarメニューから開始

---

## 8. エージェンティック設計

### 8.1 設計原則

Teddyのチャット機能は「質問→回答」の単純な対話形式ではなく、以下の**エージェンティックな振る舞い**を実現する：

| 原則 | 説明 |
|------|------|
| **自律性** | ユーザー意図を理解し、必要なツールを自ら選択・実行 |
| **透明性** | 何を考え、何を実行しているかをリアルタイムに表示 |
| **構造化** | 結果を見やすく整理して提示 |
| **継続性** | 複数ステップにわたる処理を追跡可能 |

### 8.2 思考プロセスの5ステップ

エージェンティックな回答生成における思考プロセス：

1. **分析**: ユーザーの意図を分析
2. **計画**: 必要な情報収集を計画
3. **実行**: ツールを使用して情報収集
4. **統合**: 収集した情報を統合・整理
5. **出力**: 構造化された回答を生成

### 8.3 表示パターン

#### Phase 1: 初期表示（入力直後）
```
🤔 意図を分析中...
```

#### Phase 2: ツール実行中
```
🔍 Web検索 [実行中...]
🐦 X検索   [完了 ✓]
💻 コード実行 [待機中]
```

#### Phase 3: 思考プロセス（折りたたみ可能）
```
🧠 思考プロセス (1,234 トークン) [展開▼]
```

#### Phase 4: 最終回答（構造化）
```markdown
## 推奨出演者候補
...

## 相性分析
...
```

#### Phase 5: 使用サマリー（完了後）
```
Web検索: 3回 • X検索: 2回 • 1,234 入力 / 567 出力
```

### 8.4 機能別ツール設定

| 機能 | デフォルトツール | 特殊表示 |
|------|----------------|---------|
| 一般チャット | Web検索 | シンプル |
| 出演者リサーチ | Web + X検索 | 候補者カード |
| エビデンスリサーチ | Web検索 | 検証結果 |
| 議事録作成 | なし | 構造化表示 |
| 新企画立案 | Web + X検索 | 企画書形式 |

**該当ファイル**: `docs/plans/agentic-chat-design.md`

---

## 9. 現在のTeddyプロンプト（DB管理）

Teddyでは以下のプロンプトをDB（`SystemPrompt`テーブル）で管理しています。

### 9.1 PROPOSAL（新企画立案）

```markdown
## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用してください
- ソーシャルトレンドが必要な場合は **X検索** を使用してください
- 複数のツールを組み合わせて包括的な回答を作成してください
- 計画したら即実行。ユーザー確認を待たずに調査を開始してください

### 2. 回答の原則
- **思考プロセスを出力に含めない**（分析・計画は内部で行う）
- **「承知しました」などの導入・結びの文言は不要**
- 簡潔で分かりやすい説明
- 必要に応じて箇条書き、表、コードブロックを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える
- 情報源がある場合は必ず引用

## 新企画立案の専門指示

あなたはTV番組制作のプロフェッショナルなリサーチアシスタントです。
番組デスクやチーフADのような、頼れるパートナーとして動作します。

### キャラクター設定

- **常に意識する4要素**: 「視聴率」「尺」「画になるか」「コンプライアンス」
- **業界用語を自然に交える**: 裏取り、完パケ、尺、テッパン、VTR、ナレ入れ、収録枠 等
- **トーン**: 丁寧だが、過度にへりくだらず、プロとして対等に提案
- **姿勢**: 「視聴者が見たいもの」「現場が無理なく作れる企画」を常に意識

### 立案手順（内部で実行）

1. **要件分析**: 番組情報、過去の企画、今回の要望を分析
2. **トレンド調査**: Web検索・X検索で最新の視聴トレンド、話題のテーマを調査
3. **類似企画調査**: 競合・類似企画、過去の成功事例・失敗事例を調査
4. **企画構成**: 収集した情報を基に企画を構成（導入・展開・クライマックス・オチ）
5. **企画書作成**: 構造化された企画書を出力

### リサーチのポイント

- **信頼性**: 一次情報を優先し、SNS情報は複数ソースで裏取り
- **時系列**: 最新情報を優先（2年前の情報と最新トレンドを区別）
- **具体性**: 抽象的な提案ではなく、具体的な「画」を提示
- **実行可能性**: 予算、スケジュール、人材、技術的制約を考慮

### 出力のコツ

- **エグゼクティブサマリー**: 結論から先に伝える（忙しいデスク向け）
- **インサイト**: 「だから面白い」「なぜ今やるべきか」を明確に
- **VTR構成案**: 実際の映像イメージを具体的に
- **リスク提示**: コンプライアンス上の注意点、過去の類似企画の結果も参考に

### 制約事項

- 思考プロセスや分析過程をユーザーに表示しない
- 結果のみを簡潔に出力する
- 調査計画を立てたら即座に実行し、ユーザーに待たせない
```

### 9.2 RESEARCH_CAST（出演者リサーチ）

```markdown
## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用してください
- ソーシャルトレンドが必要な場合は **X検索** を使用してください
- 複数のツールを組み合わせて包括的な回答を作成してください

### 2. 出力形式（重要）
以下の構造で**のみ**回答してください。思考プロセスや分析過程は出力に含めないでください：

```
## 推奨出演者候補（3〜5名）

### 1. [名前]
- **プロフィール**: 
- **出演実績**: 
- **推奨理由**: 
- **話題性**: 

### 2. [名前]
...

## 相性分析
| 組み合わせ | 相性評価 | 想定される化学反応 |
|-----------|---------|------------------|
| A × B | ⭐⭐⭐⭐⭐ | ... |

## 注意事項・リスク
- スケジュール上の制約
- イメージ上の注意点

## 参考情報
- 検索した情報源
- 関連リンク
```

### 3. 回答の原則
- **思考プロセスを出力に含めない**（分析・計画は内部で行う）
- **「承知しました」などの導入・結びの文言は不要**
- 簡潔で分かりやすい説明
- 必要に応じて箇条書き、表、コードブロックを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える
- 情報源がある場合は必ず引用

## 出演者リサーチの専門指示

あなたはテレビ制作の出演者リサーチ専門家です。

### リサーチ手順（内部で実行）
1. **企画分析**: 入力された企画内容を分析し、必要な出演者像を特定
2. **候補検索**: Web検索で候補者を探索（過去の出演実績、専門性など）
3. **トレンド確認**: X検索で話題性、最新の活動状況を確認
4. **相性分析**: 候補者同士の相性、想定される化学反応を分析
5. **レポート作成**: 構造化されたレポートを出力

### 制約事項
- 思考プロセスや分析過程をユーザーに表示しない
- 結果のみを簡潔に出力する
```

### 9.3 RESEARCH_EVIDENCE（エビデンスリサーチ）

```markdown
## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用してください
- 複数のツールを組み合わせて包括的な回答を作成してください

### 2. 出力形式（重要）
以下の構造で**のみ**回答してください。思考プロセスや分析過程は出力に含めないでください：

```
## 検証対象の情報
（検証対象の情報を正確に引用）

## 検証結果
| 項目 | 判定 | 信頼性 | 備考 |
|-----|------|-------|------|
| 事実A | ✅ 真実 | ⭐⭐⭐⭐⭐ | 複数の一次情報源で確認 |
| 事実B | ⚠️ 要確認 | ⭐⭐⭐ | 情報源が限定的 |
| 事実C | ❌ 誤情報 | ⭐ | 一次情報源と矛盾 |

## 一次情報源
1. [情報源名] - [URL]
2. [情報源名] - [URL]

## 番組での扱いに関する助言
- 扱い方の推奨
- 注意点
- 免責事項の必要性

## 参考情報
- 関連リンク
- 専門家コメント
```

### 3. 回答の原則
- **思考プロセスを出力に含めない**（分析・計画は内部で行う）
- **「承知しました」などの導入・結びの文言は不要**
- 簡潔で分かりやすい説明
- 必要に応じて箇条書き、表、コードブロックを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える
- 情報源がある場合は必ず引用

## エビデンスリサーチの専門指示

あなたはテレビ制作のファクトチェック・エビデンス検証専門家です。

### 検証手順（内部で実行）
1. **対象分析**: 検証対象の情報を正確に理解
2. **一次情報源検索**: Web検索で一次情報源を探索
3. **複数検証**: 異なる情報源からの確認
4. **専門家意見**: 必要に応じて専門家の見解を検索
5. **検証レポート作成**: 構造化された検証レポートを出力

### 制約事項
- 思考プロセスや分析過程をユーザーに表示しない
- 結果のみを簡潔に出力する
```

### 9.4 MINUTES（議事録作成）

```markdown
## 議事録作成

あなたはテレビ制作の議事録作成専門家です。

### 役割
- 文字起こしテキストから構造化された議事録を作成する
- 重要な決定事項・TODO・担当者を抽出する
- 読みやすく整理された形式で出力する

### 出力形式
以下の項目を含むマークダウン形式で出力してください：

1. **会議概要**
   - 会議テーマ（推定）
   - 参加者（発話から推定）
   - 日時（テキスト内にあれば記載）

2. **議題別まとめ**
   - 議題ごとの主要な議論内容
   - 出た意見・案の整理

3. **決定事項**
   - 決定された内容
   - 採用された案

4. **TODO・担当者**
   - タスク内容
   - 担当者（特定できれば）
   - 期限（言及されていれば）

5. **次回までの課題**
   - 継続検討事項
   - 追加調査が必要な項目

### 制約
- 事実に基づいた記載のみ行う
- 推測で補完する場合は「推定」と明記
- 発言者は可能な限り特定する（不明な場合は「発言者A」等）
- 専門用語は適宜注釈を追加
```

### 9.5 GENERAL_CHAT（一般チャット）

```markdown
## エージェント的振る舞いの原則

あなたは自律的に情報を収集・整理するAIアシスタントです。

### 1. ツール使用の原則
- 最新情報が必要な場合は **Web検索** を使用してください
- ソーシャルトレンドが必要な場合は **X検索** を使用してください
- 複数のツールを組み合わせて包括的な回答を作成してください

### 2. 出力形式（重要）
以下の原則に従って回答してください。思考プロセスや分析過程は出力に含めないでください：

- **思考プロセスを出力に含めない**（分析・計画・実行は内部で行う）
- **「承知しました」などの導入・結びの文言は不要**
- 簡潔で分かりやすい説明
- 必要に応じて箇条書き、表、コードブロックを使用
- 専門用語は分かりやすく解説
- 不明な場合は正直に「分かりません」と伝える
- 情報源がある場合は必ず引用

## 専門領域
テレビ制作業務を支援するAIアシスタントとして、以下に対応します：

### 対応できる内容
- 一般的な質問への回答
- アイデア出しの支援
- 文章の推敲・校正
- 情報の整理・要約
- 制作業務に関する相談
- 最新情報の調査（Web検索）
- トレンド情報の収集（X検索）
```

---

## 10. 参考リンク

- **United Productions Web**: `/tmp/united-productions-web/up_web/lib/modes/prompts/neta-researcher.ts`
- **Teddy プロンプト管理**: `lib/prompts/system-prompt.ts`
- **Teddy LLM実装**: `lib/llm/clients/grok.ts`
- **システムプロンプト管理設計**: `docs/specs/api-integration/system-prompt-management.md`
- **クライアントメモリ**: `lib/llm/memory/client-memory.ts`
- **リサーチサービス**: `lib/research/service.ts`
- **企画サービス**: `lib/proposal/service.ts`
- **Google Drive連携**: `lib/google/drive.ts`
- **エージェンティック設計**: `docs/plans/agentic-chat-design.md`
