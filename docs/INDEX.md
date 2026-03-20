# UPエージェント - ドキュメントインデックス

> **全ドキュメントの包括的なインデックス**
> 
> **最終更新**: 2026-03-20 15:47

---

## 📑 目次

- [クイックナビゲーション](#クイックナビゲーション)
- [カテゴリ別ドキュメント一覧](#カテゴリ別ドキュメント一覧)
- [更新日順一覧](#更新日順一覧)
- [ステータス別一覧](#ステータス別一覧)
- [ドキュメント検索ガイド](#ドキュメント検索ガイド)

---

## 🚀 クイックナビゲーション

### はじめに読む

| 目的 | ドキュメント | 説明 |
|------|-------------|------|
| **全体像を把握** | [docs/README.md](./README.md) | ドキュメント入り口・構成概要 |
| **技術仕様** | [specs/architecture/system-architecture.md](./specs/architecture/system-architecture.md) | システムアーキテクチャ |
| **過去の教訓** | [lessons/README.md](./lessons/README.md) | 技術選定の教訓・推奨事項 |
| **現在のタスク** | [plans/](./plans/) | 進行中の計画・実装 |
| **使い方** | [user-docs/getting-started.md](./user-docs/getting-started.md) | ユーザーガイド |

### よく参照されるドキュメント

| カテゴリ | ドキュメント | 最終更新 |
|---------|-------------|---------|
| **API仕様** | [specs/api-integration/api-specification.md](./specs/api-integration/api-specification.md) | 随時 |
| **DB設計** | [specs/api-integration/database-schema.md](./specs/api-integration/database-schema.md) | 随時 |
| **LLM連携** | [specs/api-integration/llm-integration-overview.md](./specs/api-integration/llm-integration-overview.md) | 随時 |
| **エラーハンドリング** | [specs/operations/error-handling.md](./specs/operations/error-handling.md) | 随時 |
| **デプロイ** | [specs/operations/deployment-guide.md](./specs/operations/deployment-guide.md) | 随時 |

---

## 📁 カテゴリ別ドキュメント一覧

### 🏛️ specs/ - 技術仕様（信頼できる唯一の情報源）

#### アーキテクチャ

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [system-architecture.md](./specs/architecture/system-architecture.md) | システム全体アーキテクチャ | 随時 |
| [component-design.md](./specs/architecture/component-design.md) | コンポーネント設計 | 随時 |
| [data-flow.md](./specs/architecture/data-flow.md) | データフロー設計 | 随時 |
| [state-management.md](./specs/architecture/state-management.md) | 状態管理設計 | 随時 |
| [theme-system.md](./specs/architecture/theme-system.md) | テーマシステム仕様 | 随時 |
| [code-structure-overview.md](./specs/architecture/code-structure-overview.md) | コード構造概要 | 随時 |
| [code-structure-mermaid.md](./specs/architecture/code-structure-mermaid.md) | コード構造図（Mermaid） | 随時 |

#### API・外部連携

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [api-specification.md](./specs/api-integration/api-specification.md) | API仕様書 | 随時 |
| [authentication.md](./specs/api-integration/authentication.md) | 認証設計 | 随時 |
| [database-schema.md](./specs/api-integration/database-schema.md) | DBスキーマ設計 | 随時 |
| [llm-integration.md](./specs/api-integration/llm-integration.md) | LLM連携仕様 | 随時 |
| [llm-integration-overview.md](./specs/api-integration/llm-integration-overview.md) | LLM統合概要 | 随時 |
| [llm-integration-patterns.md](./specs/api-integration/llm-integration-patterns.md) | LLM連携パターン | 随時 |
| [prompt-management.md](./specs/api-integration/prompt-management.md) | プロンプト管理 | 随時 |
| [system-prompt-management.md](./specs/api-integration/system-prompt-management.md) | システムプロンプト管理 | 随時 |
| [system-prompt-generation.md](./specs/api-integration/system-prompt-generation.md) | システムプロンプト生成 | 随時 |
| [error-handling.md](./specs/api-integration/error-handling.md) | エラーハンドリング | 随時 |
| [external-services.md](./specs/api-integration/external-services.md) | 外部サービス連携 | 随時 |
| [memory-management.md](./specs/api-integration/memory-management.md) | メモリ管理 | 随時 |
| [conversation-context-flow.md](./specs/api-integration/conversation-context-flow.md) | 会話コンテキストフロー | 随時 |
| [summarization-api.md](./specs/api-integration/summarization-api.md) | 要約API仕様 | 随時 |
| [xai-responses-api-spec.md](./specs/api-integration/xai-responses-api-spec.md) | xAI Responses API仕様 | 2026-03-18 |
| [xai-citations-behavior-spec.md](./specs/api-integration/xai-citations-behavior-spec.md) | xAI 引用挙動仕様 | 随時 |
| [2026-03-18-grok-model-comparison.md](./specs/api-integration/2026-03-18-grok-model-comparison.md) | Grokモデル比較 | 2026-03-18 |

#### 運用・品質

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [deployment-guide.md](./specs/operations/deployment-guide.md) | デプロイガイド | 随時 |
| [logging-monitoring.md](./specs/operations/logging-monitoring.md) | ログ・モニタリング | 随時 |
| [security.md](./specs/operations/security.md) | セキュリティ設計 | 随時 |
| [performance.md](./specs/operations/performance.md) | パフォーマンス設計 | 随時 |
| [testing-strategy.md](./specs/operations/testing-strategy.md) | テスト戦略 | 随時 |
| [change-history.md](./specs/operations/change-history.md) | 変更履歴 | 随時 |

#### 機能別仕様

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [features/README.md](./specs/features/README.md) | 機能仕様一覧 | 随時 |
| [features/chat.md](./specs/features/chat.md) | チャット機能仕様 | 随時 |
| [features/chat-history.md](./specs/features/chat-history.md) | チャット履歴機能仕様 | 随時 |
| [features/feature-chat-component.md](./specs/features/feature-chat-component.md) | FeatureChatコンポーネント仕様 | 随時 |
| [features/minutes.md](./specs/features/minutes.md) | 議事録機能仕様 | 随時 |
| [features/proposal.md](./specs/features/proposal.md) | 企画立案機能仕様 | 随時 |
| [features/research-cast.md](./specs/features/research-cast.md) | 出演者リサーチ仕様 | 随時 |
| [features/research-evidence.md](./specs/features/research-evidence.md) | エビデンスリサーチ仕様 | 随時 |

---

### 📚 lessons/ - 学びの蓄積（過去の教訓・推奨事項）

| ファイル | タイトル | カテゴリ | 更新日 |
|---------|---------|---------|--------|
| [README.md](./lessons/README.md) | 知見一覧・運用方法 | - | 2026-03-20 |
| [template.md](./lessons/template.md) | 新規作成用テンプレート | - | - |
| [2026-02-20-agent-human-checkpoints.md](./lessons/2026-02-20-agent-human-checkpoints.md) | 人間の介入ポイント | 開発運用 | 2026-02-20 |
| [2026-02-20-agent-swarm-development.md](./lessons/2026-02-20-agent-swarm-development.md) | Agent Swarm並列開発ガイド | 開発運用 | 2026-02-20 |
| [2026-02-21-llm-framework-comparison.md](./lessons/2026-02-21-llm-framework-comparison.md) | LLMフレームワーク選定調査 | フレームワーク | 2026-02-21 |
| [2026-02-22-api-duplication-lesson.md](./lessons/2026-02-22-api-duplication-lesson.md) | 重複API解消の教訓 | アーキテクチャ | 2026-02-22 |
| [2026-02-23-framework-evaluation.md](./lessons/2026-02-23-framework-evaluation.md) | フレームワーク・ツール導入検討 | フレームワーク | 2026-02-23 |
| [2026-02-24-langchain-premature-abstraction.md](./lessons/2026-02-24-langchain-premature-abstraction.md) | LangChain導入：過早な抽象化の失敗 | アーキテクチャ | 2026-02-24 |
| [2026-02-26-chat-streaming-loading-issue.md](./lessons/2026-02-26-chat-streaming-loading-issue.md) | チャット送信後の画面停滞問題 | アーキテクチャ | 2026-02-26 |
| [2026-02-26-lint-error-fixes.md](./lessons/2026-02-26-lint-error-fixes.md) | Lintエラー修正完了報告 | 開発運用 | 2026-02-26 |
| [2026-02-27-programs-data-verification.md](./lessons/2026-02-27-programs-data-verification.md) | レギュラー番組ナレッジデータ検証 | 調査・分析 | 2026-02-27 |
| [2026-03-20-supabase-migration-lesson.md](./lessons/2026-03-20-supabase-migration-lesson.md) | Supabase移行の教訓 | アーキテクチャ | 2026-03-20 |
| [2026-03-20-xai-direct-implementation-lesson.md](./lessons/2026-03-20-xai-direct-implementation-lesson.md) | xAI直接呼び出しへの移行教訓 | アーキテクチャ | 2026-03-20 |

---

### 📋 plans/ - 計画・設計（進行中のみ）

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [sidebar-redesign.md](./plans/sidebar-redesign.md) | サイドバー再設計 | 随時 |
| [icon-unification-plan.md](./plans/icon-unification-plan.md) | アイコン統一計画 | 随時 |
| [tool-details-display.md](./plans/tool-details-display.md) | ツール詳細表示 | 随時 |
| [knip-unused-code-report.md](./plans/knip-unused-code-report.md) | 未使用コード報告 | 随時 |
| [agentic-chat-design.md](./plans/agentic-chat-design.md) | Agenticチャット設計 | 随時 |
| [claude-code-agent-integration-plan.md](./plans/claude-code-agent-integration-plan.md) | Claude Codeエージェント統合計画 | 随時 |
| [prompt-version-management.md](./plans/prompt-version-management.md) | プロンプトバージョン管理 | 随時 |
| [program-knowledge-permissions-design.md](./plans/program-knowledge-permissions-design.md) | 番組ナレッジ権限設計 | 随時 |
| [implementation-plan-2026-03.md](./plans/implementation-plan-2026-03.md) | 2026年3月実装計画 | 随時 |

#### plans/design/ - デザイン関連

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [design-final-adjustment.md](./plans/design/design-final-adjustment.md) | デザイン最終調整 | 随時 |
| [new-project-naming-and-subtitle.md](./plans/design/new-project-naming-and-subtitle.md) | 新プロジェクト命名・サブタイトル | 随時 |
| [screenshot-for-company-announcement.md](./plans/design/screenshot-for-company-announcement.md) | 社内発表用スクリーンショット | 随時 |
| [sidebar-functionality-consultation.md](./plans/design/sidebar-functionality-consultation.md) | サイドバー機能相談 | 随時 |
| [subtitle-content-for-new-project.md](./plans/design/subtitle-content-for-new-project.md) | 新プロジェクトサブタイトル内容 | 随時 |

#### plans/development/ - 開発関連

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [admin-dashboard-cost-monitoring.md](./plans/development/admin-dashboard-cost-monitoring.md) | 管理ダッシュボード・コスト監視 | 随時 |
| [meeting-minutes-file-upload.md](./plans/development/meeting-minutes-file-upload.md) | 議事録ファイルアップロード | 随時 |
| [meeting-minutes-guide-text.md](./plans/development/meeting-minutes-guide-text.md) | 議事録ガイドテキスト | 随時 |
| [new-project-planning-porting.md](./plans/development/new-project-planning-porting.md) | 新企画立案移植 | 随時 |
| [performer-research-ui-improvement.md](./plans/development/performer-research-ui-improvement.md) | 出演者リサーチUI改善 | 随時 |
| [program-info-input-expansion.md](./plans/development/program-info-input-expansion.md) | 番組情報入力拡張 | 随時 |
| [prompt-tuning-evidence-research.md](./plans/development/prompt-tuning-evidence-research.md) | エビデンスリサーチプロンプト調整 | 随時 |
| [prompt-tuning-performer-research.md](./plans/development/prompt-tuning-performer-research.md) | 出演者リサーチプロンプト調整 | 随時 |
| [sns-paid-tool-verification.md](./plans/development/sns-paid-tool-verification.md) | SNS有料ツール検証 | 随時 |
| [test-to-production-migration.md](./plans/development/test-to-production-migration.md) | テスト→本番移行 | 随時 |
| [weekly-progress-meeting-20260305.md](./plans/development/weekly-progress-meeting-20260305.md) | 週次進捗会議 2026/03/05 | 2026-03-05 |
| [youtube-instagram-research-implementation.md](./plans/development/youtube-instagram-research-implementation.md) | YouTube/Instagramリサーチ実装 | 随時 |

#### plans/current/ - 現在の計画

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [client-server-llm-architecture.md](./plans/current/client-server-llm-architecture.md) | クライアント-サーバーLLMアーキテクチャ | 随時 |
| [conversation-memory-design.md](./plans/current/conversation-memory-design.md) | 会話メモリ設計 | 随時 |

#### plans/management/ - 管理関連

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [guide-and-manual-creation.md](./plans/management/guide-and-manual-creation.md) | ガイド・マニュアル作成 | 随時 |
| [test-user-registration.md](./plans/management/test-user-registration.md) | テストユーザー登録 | 随時 |

#### plans/release/ - リリース関連

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [bug-fixes-and-final-tuning.md](./plans/release/bug-fixes-and-final-tuning.md) | バグ修正・最終調整 | 随時 |
| [official-release-20260330.md](./plans/release/official-release-20260330.md) | 2026/03/30正式リリース | 随時 |

#### plans/testing/ - テスト関連

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [feedback-incorporation-from-field-test.md](./plans/testing/feedback-incorporation-from-field-test.md) | フィールドテストフィードバック反映 | 随時 |
| [field-test-preparation-20260312.md](./plans/testing/field-test-preparation-20260312.md) | フィールドテスト準備 2026/03/12 | 随時 |
| [research-integration-test.md](./plans/testing/research-integration-test.md) | リサーチ統合テスト | 随時 |

---

### 📝 prompts/ - システムプロンプト（DB反映用ソース）

| ファイル | 用途 | 更新日 |
|---------|------|--------|
| [GENERAL_CHAT.md](./prompts/GENERAL_CHAT.md) | 汎用チャット | 随時 |
| [MINUTES.md](./prompts/MINUTES.md) | 議事録作成 | 随時 |
| [RESEARCH_CAST.md](./prompts/RESEARCH_CAST.md) | 出演者リサーチ | 随時 |
| [RESEARCH_EVIDENCE.md](./prompts/RESEARCH_EVIDENCE.md) | エビデンスリサーチ | 随時 |
| [PROPOSAL.md](./prompts/PROPOSAL.md) | 新企画立案 | 随時 |

**注記**: 本番のSingle Source of TruthはSupabase DB。ファイル更新後は `scripts/prompts/update-from-doc.mjs` でDBに反映。

---

### 📖 user-docs/ - ユーザードキュメント（非技術者向け）

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [README.md](./user-docs/README.md) | ユーザードキュメント概要 | 随時 |
| [getting-started.md](./user-docs/getting-started.md) | クイックスタートガイド | 随時 |
| [feature-guide.md](./user-docs/feature-guide.md) | 機能ガイド | 随時 |
| [troubleshooting.md](./user-docs/troubleshooting.md) | トラブルシューティング | 随時 |
| [roadmap-cases.md](./user-docs/roadmap-cases.md) | ロードマップ・ケース | 随時 |
| [workflow-cost.md](./user-docs/workflow-cost.md) | ワークフロー・コスト | 随時 |

---

### 📂 guides/ - 開発ガイド（手順書）

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [README.md](./guides/README.md) | 開発ガイド概要 | 随時 |
| [troubleshooting.md](./guides/troubleshooting.md) | トラブルシューティング | 随時 |
| [research-tools-guide.md](./guides/research-tools-guide.md) | リサーチツールガイド | 随時 |
| [testing-e2e.md](./guides/testing-e2e.md) | E2Eテストガイド | 随時 |
| [ui-ux-guidelines.md](./guides/ui-ux-guidelines.md) | UI/UXガイドライン | 随時 |

#### guides/setup/ - 環境構築

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [database-cache.md](./guides/setup/database-cache.md) | データベース・キャッシュ設定 | 随時 |
| [vercel-authentication.md](./guides/setup/vercel-authentication.md) | Vercel認証設定 | 随時 |
| [google-oauth-setup.md](./guides/setup/google-oauth-setup.md) | Google OAuth設定 | 随時 |

#### guides/development/ - 開発標準

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [workflow-standards.md](./guides/development/workflow-standards.md) | ワークフロー標準 | 随時 |
| [code-review-checklist.md](./guides/development/code-review-checklist.md) | コードレビューチェックリスト | 随時 |
| [naming-conventions.md](./guides/development/naming-conventions.md) | 命名規則 | 随時 |

#### guides/data-quality/ - データ品質

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [tv-program-data-guide.md](./guides/data-quality/tv-program-data-guide.md) | TV番組データガイド | 随時 |

---

### 📦 backlog/ - 検討・調査・保留タスク

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [README.md](./backlog/README.md) | バックログ概要 | 随時 |
| [langchain-future-considerations.md](./backlog/langchain-future-considerations.md) | LangChain将来検討 | 随時 |
| [research-llm-api-tools-comparison.md](./backlog/research-llm-api-tools-comparison.md) | LLM APIツール比較調査 | 随時 |
| [research-neta-researcher-porting.md](./backlog/research-neta-researcher-porting.md) | ネタリサーチャー移植調査 | 随時 |
| [research-claude-skills-catalog.md](./backlog/research-claude-skills-catalog.md) | Claudeスキルカタログ調査 | 随時 |

**※ 日付付きファイルは省略（詳細はbacklog/README.md参照）**

---

### 📦 archive/ - アーカイブ（参照のみ）

| ファイル | 内容 | アーカイブ日 |
|---------|------|-------------|
| [SUMMARY.md](./archive/SUMMARY.md) | 実装サマリー | - |

**※ 多数のアーカイブファイルあり（詳細はarchive/SUMMARY.md参照）**

---

### 📊 research-reports/ - 調査レポート

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [agentic-architecture-and-rag-strategy.md](./research-reports/agentic-architecture-and-rag-strategy.md) | AgenticアーキテクチャとRAG戦略 | 随時 |
| [build-process-optimization.md](./research-reports/build-process-optimization.md) | ビルドプロセス最適化 | 随時 |
| [dependency-optimization.md](./research-reports/dependency-optimization.md) | 依存関係最適化 | 随時 |
| [langchain-xai-chatxai-responses.md](./research-reports/langchain-xai-chatxai-responses.md) | LangChain xAI ChatXAI Responses | 随時 |
| [langchain-xai-integration-roadmap.md](./research-reports/langchain-xai-integration-roadmap.md) | LangChain xAI統合ロードマップ | 随時 |
| [langchain-xai-verification-result.md](./research-reports/langchain-xai-verification-result.md) | LangChain xAI検証結果 | 随時 |
| [phase1-optimization-results.md](./research-reports/phase1-optimization-results.md) | Phase 1最適化結果 | 随時 |
| [tiktok-research-integration.md](./research-reports/tiktok-research-integration.md) | TikTokリサーチ統合 | 随時 |
| [united-productions-regular-programs.md](./research-reports/united-productions-regular-programs.md) | United Productionsレギュラー番組 | 随時 |
| [vercel-ai-sdk-poc-snippets.md](./research-reports/vercel-ai-sdk-poc-snippets.md) | Vercel AI SDK PoCスニペット | 随時 |
| [vercel-ai-sdk-xai-evaluation.md](./research-reports/vercel-ai-sdk-xai-evaluation.md) | Vercel AI SDK xAI評価 | 随時 |
| [vercel-deploy-optimization-summary.md](./research-reports/vercel-deploy-optimization-summary.md) | Vercelデプロイ最適化サマリー | 随時 |
| [vercel-deploy-speed-optimization.md](./research-reports/vercel-deploy-speed-optimization.md) | Vercelデプロイ速度最適化 | 随時 |
| [vercel-specific-optimizations.md](./research-reports/vercel-specific-optimizations.md) | Vercel特有の最適化 | 随時 |
| [youtube-instagram-research-integration.md](./research-reports/youtube-instagram-research-integration.md) | YouTube/Instagramリサーチ統合 | 随時 |

---

### 🔧 refactoring/ - リファクタリング

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| [drag-drop-investigation.md](./refactoring/drag-drop-investigation.md) | ドラッグ&ドロップ調査 | 随時 |
| [drag-drop-refactoring-plan.md](./refactoring/drag-drop-refactoring-plan.md) | ドラッグ&ドロップリファクタリング計画 | 随時 |

---

### 👥 dev-meeting/ - 開発会議

| ファイル | 内容 | 更新日 |
|---------|------|--------|
| 各種会議メモ | LangCore - United Productions様会議メモ | 随時 |

---

## 📅 更新日順一覧

### 2026年3月

| 日付 | ファイル | カテゴリ |
|------|---------|---------|
| 2026-03-20 | [lessons/2026-03-20-xai-direct-implementation-lesson.md](./lessons/2026-03-20-xai-direct-implementation-lesson.md) | lessons |
| 2026-03-20 | [lessons/2026-03-20-supabase-migration-lesson.md](./lessons/2026-03-20-supabase-migration-lesson.md) | lessons |
| 2026-03-20 | [archive/2026-03-20-xai-implementation-restore-guide-completed.md](./archive/2026-03-20-xai-implementation-restore-guide-completed.md) | archive |
| 2026-03-20 | [archive/2026-03-20-supabase-full-migration-plan.md](./archive/2026-03-20-supabase-full-migration-plan.md) | archive |
| 2026-03-20 | [archive/2026-03-20-research-supabase-migration-completed.md](./archive/2026-03-20-research-supabase-migration-completed.md) | archive |
| 2026-03-20 | [archive/2026-03-20-langchain-migration-plan.md](./archive/2026-03-20-langchain-migration-plan.md) | archive |
| 2026-03-18 | [specs/api-integration/2026-03-18-grok-model-comparison.md](./specs/api-integration/2026-03-18-grok-model-comparison.md) | specs |
| 2026-03-12 | [plans/testing/field-test-preparation-20260312.md](./plans/testing/field-test-preparation-20260312.md) | plans |
| 2026-03-11 | [archive/2026-03-11-supabase-google-oauth-setup.md](./archive/2026-03-11-supabase-google-oauth-setup.md) | archive |
| 2026-03-08 | [backlog/2026-03-08-todo-pre-commit-hook-ignore-mismatch.md](./backlog/2026-03-08-todo-pre-commit-hook-ignore-mismatch.md) | backlog |
| 2026-03-05 | [plans/development/weekly-progress-meeting-20260305.md](./plans/development/weekly-progress-meeting-20260305.md) | plans |

### 2026年2月

| 日付 | ファイル | カテゴリ |
|------|---------|---------|
| 2026-02-27 | [lessons/2026-02-27-programs-data-verification.md](./lessons/2026-02-27-programs-data-verification.md) | lessons |
| 2026-02-27 | [backlog/2026-02-27-research-chat-latency-investigation.md](./backlog/2026-02-27-research-chat-latency-investigation.md) | backlog |
| 2026-02-27 | [backlog/2026-02-27-implement-chat-ux-improvements.md](./backlog/2026-02-27-implement-chat-ux-improvements.md) | backlog |
| 2026-02-27 | [backlog/2026-02-27-ci-test-failures.md](./backlog/2026-02-27-ci-test-failures.md) | backlog |
| 2026-02-26 | [lessons/2026-02-26-chat-streaming-loading-issue.md](./lessons/2026-02-26-chat-streaming-loading-issue.md) | lessons |
| 2026-02-26 | [lessons/2026-02-26-lint-error-fixes.md](./lessons/2026-02-26-lint-error-fixes.md) | lessons |
| 2026-02-26 | [backlog/2026-02-26-research-x-search-citations-comprehensive.md](./backlog/2026-02-26-research-x-search-citations-comprehensive.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-research-x-search-citations-workaround.md](./backlog/2026-02-26-research-x-search-citations-workaround.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-todo-featurechat-streaming-improvements.md](./backlog/2026-02-26-todo-featurechat-streaming-improvements.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-todo-lint-suppression-review.md](./backlog/2026-02-26-todo-lint-suppression-review.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-review-suppression-comments.md](./backlog/2026-02-26-review-suppression-comments.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-css-parse-errors.md](./backlog/2026-02-26-css-parse-errors.md) | backlog |
| 2026-02-26 | [backlog/2026-02-26-improvement-accessibility.md](./backlog/2026-02-26-improvement-accessibility.md) | backlog |
| 2026-02-25 | [backlog/2026-02-25-todo-llm-response-latency-optimization.md](./backlog/2026-02-25-todo-llm-response-latency-optimization.md) | backlog |
| 2026-02-25 | [backlog/2026-02-25-ux-improvement-priority.md](./backlog/2026-02-25-ux-improvement-priority.md) | backlog |
| 2026-02-24 | [lessons/2026-02-24-langchain-premature-abstraction.md](./lessons/2026-02-24-langchain-premature-abstraction.md) | lessons |
| 2026-02-24 | [archive/2026-02-24-xai-agent-tools-final.md](./archive/2026-02-24-xai-agent-tools-final.md) | archive |
| 2026-02-24 | [archive/2026-02-24-research-llm-tools-comparison.md](./archive/2026-02-24-research-llm-tools-comparison.md) | archive |
| 2026-02-24 | [archive/2026-02-24-research-grok-agent-tools.md](./archive/2026-02-24-research-grok-agent-tools.md) | archive |
| 2026-02-24 | [archive/2026-02-24-security.md](./archive/2026-02-24-security.md) | archive |
| 2026-02-24 | [archive/2026-02-24-performance.md](./archive/2026-02-24-performance.md) | archive |
| 2026-02-24 | [backlog/2026-02-24-idea-sns-research-agent.md](./backlog/2026-02-24-idea-sns-research-agent.md) | backlog |
| 2026-02-24 | [backlog/2026-02-24-idea-sns-research-agent-ui.md](./backlog/2026-02-24-idea-sns-research-agent-ui.md) | backlog |
| 2026-02-24 | [backlog/2026-02-24-research-search-api-selection.md](./backlog/2026-02-24-research-search-api-selection.md) | backlog |
| 2026-02-24 | [backlog/2026-02-24-todo-db-summary-storage.md](./backlog/2026-02-24-todo-db-summary-storage.md) | backlog |
| 2026-02-23 | [lessons/2026-02-23-framework-evaluation.md](./lessons/2026-02-23-framework-evaluation.md) | lessons |
| 2026-02-22 | [lessons/2026-02-22-api-duplication-lesson.md](./lessons/2026-02-22-api-duplication-lesson.md) | lessons |
| 2026-02-22 | [archive/2026-02-22-refactoring-completed.md](./archive/2026-02-22-refactoring-completed.md) | archive |
| 2026-02-21 | [lessons/2026-02-21-llm-framework-comparison.md](./lessons/2026-02-21-llm-framework-comparison.md) | lessons |
| 2026-02-20 | [lessons/2026-02-20-agent-swarm-development.md](./lessons/2026-02-20-agent-swarm-development.md) | lessons |
| 2026-02-20 | [lessons/2026-02-20-agent-human-checkpoints.md](./lessons/2026-02-20-agent-human-checkpoints.md) | lessons |
| 2026-02-20 | [archive/2026-02-20-refactoring-completed.md](./archive/2026-02-20-refactoring-completed.md) | archive |

---

## 🏷️ ステータス別一覧

### ⭐ 最新・優先参照（specs/, lessons/）

| ドキュメント | ステータス | 理由 |
|-------------|-----------|------|
| [specs/architecture/system-architecture.md](./specs/architecture/system-architecture.md) | 🟢 最新 | システム全体像 |
| [specs/api-integration/llm-integration-overview.md](./specs/api-integration/llm-integration-overview.md) | 🟢 最新 | xAI直接実装方式 |
| [lessons/2026-03-20-xai-direct-implementation-lesson.md](./lessons/2026-03-20-xai-direct-implementation-lesson.md) | 🟢 最新 | xAI移行教訓 |
| [lessons/2026-03-20-supabase-migration-lesson.md](./lessons/2026-03-20-supabase-migration-lesson.md) | 🟢 最新 | Supabase移行教訓 |
| [lessons/2026-02-24-langchain-premature-abstraction.md](./lessons/2026-02-24-langchain-premature-abstraction.md) | 🟢 最新 | LangChain教訓 |

### 🟡 進行中（plans/）

| ドキュメント | ステータス | 備考 |
|-------------|-----------|------|
| [plans/release/official-release-20260330.md](./plans/release/official-release-20260330.md) | 🟡 進行中 | 3/30リリース目標 |
| [plans/current/conversation-memory-design.md](./plans/current/conversation-memory-design.md) | 🟡 進行中 | 会話メモリ設計 |
| [plans/development/prompt-tuning-evidence-research.md](./plans/development/prompt-tuning-evidence-research.md) | 🟡 進行中 | エビデンスプロンプト調整 |

### 🔵 参照・歴史的（archive/）

| ドキュメント | ステータス | 備考 |
|-------------|-----------|------|
| [archive/SUMMARY.md](./archive/SUMMARY.md) | 🔵 参照用 | 実装サマリー |
| [archive/2026-02-24-xai-agent-tools-final.md](./archive/2026-02-24-xai-agent-tools-final.md) | 🔵 歴史的 | xAI実装計画（完了） |
| [archive/2026-02-22-refactoring-completed.md](./archive/2026-02-22-refactoring-completed.md) | 🔵 歴史的 | リファクタリング完了報告 |

### ⏸️ 保留（backlog/）

| ドキュメント | ステータス | 備考 |
|-------------|-----------|------|
| [backlog/2026-02-27-research-chat-latency-investigation.md](./backlog/2026-02-27-research-chat-latency-investigation.md) | ⏸️ 保留 | チャット遅延調査 |
| [backlog/2026-02-26-todo-featurechat-streaming-improvements.md](./backlog/2026-02-26-todo-featurechat-streaming-improvements.md) | ⏸️ 保留 | ストリーミング改善 |
| [backlog/langchain-future-considerations.md](./backlog/langchain-future-considerations.md) | ⏸️ 保留 | LangChain将来検討 |

---

## 🔍 ドキュメント検索ガイド

### 目的別検索コマンド

```bash
# 技術仕様を探す
find docs/specs -name "*.md" | head -20

# 最近更新されたファイルを確認（更新日順）
ls -lt docs/**/*.md 2>/dev/null | head -20

# 特定のキーワードを含むドキュメントを検索
grep -r "LangChain" docs/ --include="*.md" -l

# 特定ディレクトリ内のキーワード検索
grep -r "xAI" docs/specs/ --include="*.md" -n

# アーカイブ内を検索
grep -r "キーワード" docs/archive/ --include="*.md" -l

# ファイル名で検索
find docs/ -name "*auth*.md"
find docs/ -name "*error*.md"

# 1週間以内に更新されたファイル
find docs/ -name "*.md" -mtime -7

# 1ヶ月以内に更新されたファイル
find docs/ -name "*.md" -mtime -30
```

### キーワード別検索マップ

| 検索したい内容 | コマンド |
|---------------|---------|
| **LLM関連** | `grep -r "LLM\|Grok\|Gemini\|xAI" docs/specs/ --include="*.md" -l` |
| **認証関連** | `grep -r "auth\|OAuth\|Supabase" docs/specs/ --include="*.md" -l` |
| **DB関連** | `grep -r "database\|Prisma\|schema" docs/specs/ --include="*.md" -l` |
| **エラー関連** | `grep -r "error\|handling" docs/specs/ --include="*.md" -l` |
| **プロンプト関連** | `grep -r "prompt" docs/prompts/ --include="*.md" -l` |
| **テスト関連** | `grep -r "test\|e2e\|playwright" docs/ --include="*.md" -l` |
| **デプロイ関連** | `grep -r "deploy\|vercel" docs/specs/ --include="*.md" -l` |

### よく使う検索パターン

```bash
# 1. まずdocs/README.mdで全体像を把握
cat docs/README.md

# 2. 目的に応じてジャンプ
# 技術仕様 → specs/
# 過去の教訓 → lessons/
# 現在のタスク → plans/

# 3. 詳細はINDEX.md（本ファイル）で検索
grep -n "キーワード" docs/INDEX.md

# 4. ファイル名を確認して読む
cat docs/specs/xxxx.md
```

---

## 🔗 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [docs/README.md](./README.md) | ドキュメント入り口・全体構成 |
| [lessons/README.md](./lessons/README.md) | 過去の教訓・推奨事項一覧 |
| [specs/README.md](./specs/README.md) | 技術仕様一覧 |
| [guides/README.md](./guides/README.md) | 開発ガイド一覧 |
| [archive/SUMMARY.md](./archive/SUMMARY.md) | 実装サマリー・アーカイブ一覧 |
| [AGENTS.md](../AGENTS.md) | エージェント行動指針 |

---

**最終更新**: 2026-03-20 15:47
