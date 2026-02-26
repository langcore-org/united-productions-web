---
name: project-docs
description: Manage project documentation in docs/ directory. Use when working with backlog items, implementation plans, lessons learned, or documentation maintenance. Triggers include "backlogに追加", "計画書を作成", "学びを記録", "ドキュメント整理", or any docs/ related tasks.
---

# Project Docs

プロジェクトドキュメント（backlog/plan/lesson）を管理するスキル。

## コマンド一覧

### Backlog（docs/backlog/）

```bash
# 保留タスク/イシュー/アイデアの作成
node .claude/skills/project-docs/scripts/docs.js backlog create-todo "タスク名" \
  --priority=pending --file=app/api/chat/route.ts

node .claude/skills/project-docs/scripts/docs.js backlog create-issue "メモリリーク" \
  --priority=high

node .claude/skills/project-docs/scripts/docs.js backlog create-idea "AI画像生成" \
  --priority=medium

# 一覧表示
node .claude/skills/project-docs/scripts/docs.js backlog list
node .claude/skills/project-docs/scripts/docs.js backlog list --priority=pending
node .claude/skills/project-docs/scripts/docs.js backlog list --type=todo

# plans/へ移動（実装決定）
node .claude/skills/project-docs/scripts/docs.js backlog promote docs/backlog/idea-xxx.md

# archive/へ移動（完了・優先度低下）
node .claude/skills/project-docs/scripts/docs.js backlog archive docs/backlog/xxx.md
```

**優先度**: `high` (🔴高) | `medium` (🟡中) | `low` (🟢低) | `pending` (⏸️保留)

**種別**: `todo` (保留タスク) | `issue` (問題) | `idea` (アイデア) | `research` (調査)

### Plan（docs/plans/）

```bash
# 計画書作成
node .claude/skills/project-docs/scripts/docs.js plan create "会議録音アップロード機能"

# 計画書一覧
node .claude/skills/project-docs/scripts/docs.js plan list

# 進捗更新
node .claude/skills/project-docs/scripts/docs.js plan update docs/plans/xxx.md \
  --task=2 --status=done

# lessons/へ変換（実装完了後）
node .claude/skills/project-docs/scripts/docs.js plan convert docs/plans/xxx.md

# archive/へ移動（完了・中止）
node .claude/skills/project-docs/scripts/docs.js plan archive docs/plans/xxx.md
```

### Lesson（docs/lessons/）

```bash
# 対話形式で学びを記録
node .claude/skills/project-docs/scripts/docs.js lesson record

# 一覧表示
node .claude/skills/project-docs/scripts/docs.js lesson list
node .claude/skills/project-docs/scripts/docs.js lesson list --category=architecture

# 検索
node .claude/skills/project-docs/scripts/docs.js lesson search "LangChain"

# テンプレート表示
node .claude/skills/project-docs/scripts/docs.js lesson template
```

### Docs Maintenance

```bash
# 内部リンク切れチェック
node .claude/skills/project-docs/scripts/docs.js check-links

# 重複コンテンツ検出
node .claude/skills/project-docs/scripts/docs.js check-dupes

# 統計表示
node .claude/skills/project-docs/scripts/docs.js stats
```

## 使用フロー

### 1. 実装中に保留タスクを記録

```bash
# 即座に作成
node .claude/skills/project-docs/scripts/docs.js backlog create-todo "エラーハンドリング改善" \
  --priority=pending \
  --file=app/api/chat/route.ts
```

コードにTODOコメントを残す:
```typescript
// TODO: [高] エラーハンドリング改善
// docs/backlog/todo-xxx.md を参照
// 現在は簡易的な実装
```

### 2. 実装計画を立てる

```bash
# Backlogから計画書へ
node .claude/skills/project-docs/scripts/docs.js backlog promote docs/backlog/idea-xxx.md

# または直接作成
node .claude/skills/project-docs/scripts/docs.js plan create "新機能名"
```

計画書テンプレートに従って記入:
- 目的・背景
- タスク分解
- 見積もり・期限
- 依存関係

### 3. 実装完了後に学びを記録

```bash
# 計画書から変換（推奨）
node .claude/skills/project-docs/scripts/docs.js plan convert docs/plans/xxx.md

# または対話形式で新規作成
node .claude/skills/project-docs/scripts/docs.js lesson record
```

必須セクション:
- 概要（1-2文）
- 背景・なぜ取り組んだか
- 結果・最終的な解決策
- 教訓・試行錯誤したこと
- 推奨事項・次のアクション

## 命名規則

| ディレクトリ | 命名規則 | 例 |
|-------------|---------|-----|
| `backlog/` | `{type}-{timestamp}-{title}.md` | `todo-1234567890-error-handling.md` |
| `plans/` | `{title}.md` | `meeting-upload-feature.md` |
| `lessons/` | `YYYY-MM-DD-{title}.md` | `2026-02-26-chat-streaming-issue.md` |
| `archive/` | `YYYY-MM-DD-{original}.md` | `2026-02-26-todo-xxx.md` |

## 関連ドキュメント

- `docs/backlog/README.md` - バックログ運用ルール
- `docs/lessons/README.md` - 学びの記録ガイド
- `AGENTS.md` - ドキュメント更新ルール
