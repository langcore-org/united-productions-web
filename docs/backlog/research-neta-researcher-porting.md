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

### 3.2 プロンプト管理

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **管理方式** | コード内定義 (lib/modes/prompts/*.ts) | DB管理 (SystemPromptテーブル) + フォールバック |
| **プロンプト構成** | モジュール式（CORE_RULES + Mode + Google Drive + Infographic） | 単一プロンプト（番組情報 + 機能プロンプト） |
| **バージョン管理** | なし（コード管理） | あり（SystemPromptVersionテーブル） |
| **動的切り替え** | コード変更が必要 | DB更新のみで反映 |

### 3.3 セッション/ストリーミング

| 項目 | United Productions | Teddy (AI Hub) |
|------|-------------------|----------------|
| **セッション管理** | 外部Agent APIが管理 | ClientMemory（ブラウザ側） |
| **ストリーミング** | Agent API SSE → 変換 → Vercel AI SDK | 直接xAI SSE → シンプルSSE |
| **カスタムイベント** | todo_update, file_created, gdrive_file_created | tool_call, citation, status |
| **再接続** | セッションバッファ経由の再接続対応 | 未実装（ページリロードで消失） |

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

### 4.2 ワークフロー（Phase 1-5）

| Phase | 内容 | 使用ツール | Teddy移植時の課題 |
|-------|------|-----------|------------------|
| **Phase 1** | コンテキスト取得・コンセプト生成 | AskUserQuestion | AskUserQuestionツールがない |
| **Phase 2** | リサーチ計画策定 | WebSearch, TodoWrite | TodoWriteツールがない |
| **Phase 3** | 徹底リサーチ（Deep Dive） | WebSearch, WebFetch, TodoWrite | WebFetch相当が必要 |
| **Phase 4** | ネタ帳提出 | gdrive_upload_file | Google Drive連携が必要 |
| **Phase 5** | インフォグラフィック生成（オプション） | Bash + gdrive_upload_file | 画像生成基盤が必要 |

### 4.3 最重要ルール（neta-researcher固有）

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

### 5.2 オプション機能

| 機能 | 優先度 | 実装方針 |
|------|--------|---------|
| **インフォグラフィック生成** | 低 | Pythonスクリプト or Replicate API等 |
| **Phase 1の詳細ヒアリング** | 中 | 現在の「出演者リサーチ」等と同様の形式で入力 |

### 5.3 プロンプト調整が必要な点

| 項目 | 現状（Claude） | 調整案（Grok） |
|------|---------------|---------------|
| **ツール名** | WebSearch, WebFetch, TodoWrite等 | web_search（組み込み） |
| **即実行指示** | 「同じメッセージ内でツールを呼び出す」 | Grokは自律的にツールを使うため、強調不要 |
| **タスク管理** | TodoWriteでAIが管理 | AIに任せず、フロントエンドで管理 |
| **ファイル保存** | gdrive_upload_file | 生成後にAPI経由で保存（AIに任せない） |

---

## 6. 推奨される移植アプローチ

### 6.1 段階的実装プラン

```
Phase 1: 基本機能（最小限）
├── Google Drive連携API実装
├── プロンプトDB登録（PROPOSALキーで再利用 or NEW_PLANNINGキー新設）
└── シンプルなリサーチ → レポート生成フロー

Phase 2: 機能強化
├── タスクリストUI（フロントエンド管理）
├── 画像収集・表示機能
└── レポートテンプレート改善

Phase 3: 高度な機能
├── WebFetch相当の詳細情報取得
├── インフォグラフィック生成
└── 複数フォーマット出力（PDF等）
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

## 8. 参考リンク

- **United Productions Web**: `/tmp/united-productions-web/up_web/lib/modes/prompts/neta-researcher.ts`
- **Teddy プロンプト管理**: `lib/prompts/system-prompt.ts`
- **Teddy LLM実装**: `lib/llm/clients/grok.ts`
- **システムプロンプト管理設計**: `docs/specs/api-integration/system-prompt-management.md`
