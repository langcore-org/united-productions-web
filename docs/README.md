# UPエージェント - ドキュメントガイド

> **本ディレクトリは「UPエージェント」（AI Hub）開発用のドキュメント群です。**
> 
> **最終更新**: 2026-02-24 12:55

---

## 📋 ドキュメント作成・更新ルール

### 必須事項

1. **更新日時の記録**
   - ファイルを変更したら、必ず**日時（時間含む）**を記載
   - 形式: `YYYY-MM-DD HH:MM` または ISO 8601
   - 位置: ファイル先頭のメタデータ欄、または変更箇所の近く
   - **日時の取得コマンド**:
     ```bash
     date +"%Y-%m-%d %H:%M"
     ```

2. **ファイルサイズの制限**
   - 1ファイルは**200行以内**を目安
   - 超える場合は分割を検討

3. **内容の重複禁止**
   - 同じ内容を複数ファイルに書かない
   - 詳細は1箇所に集約し、他は参照リンクにする

4. **参照リンクの充実**
   - 関連する仕様・手順には必ずリンクを付ける
   - リンク形式: `[表示名](./path/to/file.md)`

5. **ドキュメントは削除せず、アーカイブに移動する**
   - 古くなったドキュメントや完了した計画書は削除しない
   - 代わりに `archive/` ディレクトリに移動する
   - 理由: 過去の決定事項や調査結果を後から参照する可能性があるため
   - **アーカイブ時の命名規則**: ファイル名の先頭にアーカイブ日付を付ける
     - 形式: `YYYY-MM-DD-元のファイル名.md`
     - **日付の取得コマンド**:
       ```bash
       date +"%Y-%m-%d"
       ```
     - 例: `2026-02-24-sidebar-redesign.md`

### 参照リンクの優先順位

| 優先度 | 参照先 | 例 |
|-------|--------|-----|
| 1 | 実装ファイル（ソースコード） | `prisma/schema.prisma` |
| 2 | 同ディレクトリの仕様 | `[error-handling.md](./error-handling.md)` |
| 3 | 別ディレクトリのドキュメント | `[guides/setup/](../guides/setup/)` |
| 4 | 外部リソース | 公式ドキュメント等 |

### ドキュメント種別ごとの役割

| ディレクトリ | 役割 | 対象者 | 更新頻度 |
|-------------|------|--------|---------|
| `specs/` | **技術仕様** - システムの根幹を成す設計 | 開発者 | 随時 |
| `user-docs/` | **ユーザードキュメント** - 機能の使い方・運用 | 制作スタッフ、管理職 | 機能変更時 |
| `plans/` | **計画・設計** - 特定の機能開発や改善計画 | 開発者、制作部 | 進行中のみ |
| `guides/` | **手順書** - 環境構築、開発手順、ツール使い方 | 開発者 | 環境変化時 |
| `archive/` | **過去資料** - 参照のみ、更新しない | 全員 | なし |

---

## 📁 ディレクトリ構成

```
docs/
├── README.md                          # 本ファイル（ドキュメントガイド）
│
├── specs/                             # 【技術仕様】開発者向け
│   ├── README.md                      # specs/ の構成案内
│   ├── architecture/                  # アーキテクチャ設計
│   │   ├── system-architecture.md     # システム構成
│   │   ├── component-design.md        # コンポーネント設計
│   │   ├── data-flow.md               # データフロー
│   │   └── state-management.md        # 状態管理
│   ├── api-integration/               # API・外部連携
│   │   ├── api-specification.md       # API仕様
│   │   ├── authentication.md          # 認証・認可仕様
│   │   ├── database-schema.md         # DB設計
│   │   ├── llm-integration.md         # LLM統合仕様
│   │   ├── prompt-engineering.md      # プロンプト設計
│   │   ├── external-services.md       # 外部サービス連携
│   │   ├── genspark-api-research.md   # Genspark API調査
│   │   ├── grok-agent-tools.md        # Grok Agentツール
│   │   └── system-prompt-management.md # システムプロンプト管理
│   ├── operations/                    # 運用・品質
│   │   ├── deployment-guide.md        # デプロイ構成
│   │   ├── logging-monitoring.md      # ログ・監視設計
│   │   ├── error-handling.md          # エラーハンドリング仕様
│   │   ├── security.md                # セキュリティ仕様
│   │   ├── performance.md             # パフォーマンス仕様
│   │   ├── testing-strategy.md        # テスト戦略
│   │   └── change-history.md          # 変更履歴
│   ├── api-changelog.md               # API変更ログ
│   ├── change-history.md              # 変更履歴（移行予定）
│   ├── performance.md                 # パフォーマンス仕様（移行予定）
│   └── security.md                    # セキュリティ仕様（移行予定）
│
├── user-docs/                         # 【ユーザードキュメント】非技術者向け
│   ├── README.md                      # ユーザードキュメント案内
│   ├── getting-started.md             # はじめての人向けガイド
│   ├── feature-guide.md               # 機能ガイド・操作手順
│   ├── workflow-cost.md               # 業務統合・コスト管理
│   ├── troubleshooting.md             # トラブルシューティング
│   └── roadmap-cases.md               # 今後の予定・活用事例
│
├── plans/                             # 計画・設計（進行中のみ）
│   ├── product-requirements.md        # 要件定義
│   ├── tasks-overview.md              # タスク一覧（概要）
│   ├── tasks-detailed.md              # タスク一覧（詳細）
│   ├── status-dashboard.md            # 実装状況
│   ├── sidebar-redesign.md            # サイドバー改修計画
│   ├── agentic-chat-design.md         # Agentic Chat設計
│   ├── langchain-migration-plan.md    # LangChain移行計画
│   └── knip-unused-code-report.md     # 未使用コードレポート
│
├── guides/                            # 手順書・チュートリアル（開発者向け）
│   ├── setup/                         # 環境構築
│   │   ├── database-cache.md          # Neon + Upstash設定
│   │   ├── vercel-authentication.md   # Vercel認証設定
│   │   └── google-oauth-setup.md      # Google OAuth設定
│   ├── development/                   # 開発ガイド
│   │   ├── workflow-standards.md      # 開発ワークフロー標準
│   │   ├── code-review-checklist.md   # コードレビューチェックリスト
│   │   ├── naming-conventions.md      # 命名規約と型定義
│   │   └── technical-review-20260215.md # 技術レビュー記録
│   ├── testing-e2e.md                 # E2Eテスト手順
│   ├── research-tools-guide.md        # リサーチツール使い方
│   ├── ui-ux-guidelines.md            # UI/UXガイドライン
│   └── troubleshooting.md             # トラブルシューティングガイド
│
├── archive/                           # 過去資料・完了した計画（参照のみ、更新しない）
│   ├── SUMMARY.md                     # アーカイブサマリー
│   │
│   │   # 旧計画書（plans/archive/ から移行）
│   ├── 2026-02-improvements.md
│   ├── 2026-02-refactoring.md
│   ├── 2026-02-20-refactoring-completed.md
│   ├── 2026-02-22-refactoring-completed.md
│   ├── framework-tool-evaluation.md
│   ├── langchain-migration-completion-report.md
│   ├── langchain-migration-verification-report.md
│   ├── unused-code-report.md           # 未使用コード調査
│   ├── unused-code-detailed-report.md  # 未使用コード詳細
│   ├── duplicate-api-resolution.md     # API重複解消
│   ├── langchain-api-duplicate-analysis.md # LangChain API分析
│   │
│   │   # 過去資料
│   ├── 2〜4月ロードマップ.md
│   ├── LC開発プラン.md
│   ├── human-checkpoints.md
│   ├── parallel-development.md
│   ├── genspark-api-research.md
│   ├── リサーチ考査チャットアプリ_実装プラン.md
│   ├── ロケスケ香盤車両表_ウェブアプリ実装プラン.md
│   ├── 今後のプラン.md
│   ├── 書き起こし機能のメモ.md
│   ├── 業務洗い出しとソリューション.md
│   │
│   └── logs/                          # 過去のログ（アーカイブ済み）
│       ├── README.md
│       ├── SUMMARY.md
│       ├── cache-rate-limit.md
│       ├── dashboard.md
│       ├── llm-streaming.md
│       ├── meeting-20260219.md
│       ├── pj-a-meeting.md
│       ├── pj-b-transcript.md
│       ├── pj-c-research.md
│       ├── pj-d-schedule.md
│       └── template.md
│
├── theme-system.md                    # テーマシステム仕様
├── sns-research-agent-spec.md         # SNSリサーチエージェント仕様
├── sns-research-agent-ui-spec.md      # SNSリサーチエージェントUI仕様
│
└── assets/                            # 添付ファイル
    └── ...
```

---

## 🚀 クイックスタート

### 技術者向け

1. [`specs/architecture/system-architecture.md`](specs/architecture/system-architecture.md) - システム構成
2. [`specs/api-integration/api-specification.md`](specs/api-integration/api-specification.md) - API仕様
3. [`plans/product-requirements.md`](plans/product-requirements.md) - 要件定義

### 制作スタッフ・管理職向け

1. [`user-docs/getting-started.md`](user-docs/getting-started.md) - 基本的な使い方
2. [`user-docs/feature-guide.md`](user-docs/feature-guide.md) - 機能の詳細
3. [`user-docs/workflow-cost.md`](user-docs/workflow-cost.md) - 業務への組み込み方

### 環境構築（開発者）
- [`guides/setup/database-cache.md`](guides/setup/database-cache.md)
- [`guides/setup/vercel-authentication.md`](guides/setup/vercel-authentication.md)
- [`guides/setup/google-oauth-setup.md`](guides/setup/google-oauth-setup.md)

### 開発ガイド
- [`guides/development/workflow-standards.md`](guides/development/workflow-standards.md) - ワークフロー標準
- [`guides/development/code-review-checklist.md`](guides/development/code-review-checklist.md) - レビューチェックリスト
- [`guides/development/naming-conventions.md`](guides/development/naming-conventions.md) - 命名規約
- [`guides/troubleshooting.md`](guides/troubleshooting.md) - トラブルシューティング

---

## 📋 運用ルール

### 計画書のライフサイクル

```
計画作成 → plans/ に配置 → 実装 → 完了 → archive/ に移動
```

| ステータス | 場所 | 操作 |
|-----------|------|------|
| 進行中 | `plans/` | 随時更新 |
| 完了 | `archive/` | 参照のみ、更新禁止 |

### 情報の信頼順位

実装と矛盾した場合の優先順位：

1. `specs/` - 技術仕様（最優先）
2. 実装コード（ソースコード）
3. `guides/` - 手順書
4. その他

### ファイル命名規則

- **ケバブケース**（例: `api-specification.md`）
- **日本語ファイル名は避ける**
- **日付プレフィックス**は計画書のみ（例: `2026-02-22-refactoring.md`）

---

## 🔍 検索・活用方法

### コマンド例

```bash
# キーワードで全文検索
grep -r "LangChain" docs/specs/ --include="*.md"

# 特定ディレクトリ内のみ検索
grep -r "認証" docs/specs/api-integration/ --include="*.md"

# 最近更新されたファイルを確認
ls -lt docs/**/*.md | head -10

# ファイル名で検索
find docs/ -name "*auth*.md"
```

---

## 🔗 参照ルール

### 技術者
1. **必ず読む**: `specs/architecture/system-architecture.md`
2. **API確認**: `specs/api-integration/api-specification.md`
3. **現在のタスク**: `plans/`
4. **トラブル時**: `guides/troubleshooting.md`

### 制作スタッフ
1. **必ず読む**: `user-docs/getting-started.md`
2. **機能の詳細**: `user-docs/feature-guide.md`
3. **困ったとき**: `user-docs/troubleshooting.md`
