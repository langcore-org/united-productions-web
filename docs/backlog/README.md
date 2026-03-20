# Backlog（検討・調査・将来対応）

> **最終更新**: 2026-03-20 14:35

---

## 📋 このディレクトリの目的

> **いつか対応すべきこと、検討・調査段階のアイデアを管理**
> 
> **最終更新**: 2026-03-20 14:35

---

## 📋 このディレクトリの目的

`backlog/` は以下を管理する場所：

| 種別 | 説明 | 例 |
|-----|------|-----|
| **検討段階** | 実装するか未定のアイデア | 新機能の提案 |
| **調査段階** | 技術調査が必要な項目 | 新ライブラリの評価 |
| **将来対応** | 優先度低いが対応したい項目 | リファクタリング候補 |
| **参考資料** | 将来の判断材料になる情報 | 競合分析、技術記事 |
| **実装中の保留タスク** | 実装中に出てきた後回しタスク | TODOコメントから抽出した課題 |
| **実装中のイシュー** | 実装中に発見した問題 | 技術的負債、バグの温床 |

---

## 🔄 ライフサイクル

```
アイデア発生 → backlog/ に配置 → 検討・調査 → 実装決定 → plans/ に移動
                                    ↓
                              優先度低下 → archive/ に移動 or 削除

実装中に発見 ─→ backlog/ に配置 ─→ 対応時期決定 → plans/ or 即座に対応
    ↑___________________________________________|
         （対応後は完了として削除 or archive/）
```

| ステータス | 場所 | 次のアクション |
|-----------|------|--------------|
| 検討・調査中 | `backlog/` | 継続検討 or `plans/` へ移動 |
| 実装中の保留 | `backlog/` | 対応時期決定 or 即座に対応 |
| 実装決定 | `plans/` | 実装開始 |
| 優先度低下 | `archive/` | 参照のみ |

---

## 📝 ファイル命名規則

```
YYYY-MM-DD-{カテゴリ}-{簡潔な説明}.md
```

**必須**: ファイル名の先頭に**作成日**を `YYYY-MM-DD-` 形式で入れる。これにより時系列でソート可能になり、古い項目の管理が容易になる。

| カテゴリ | 用途 | 例 |
|---------|------|-----|
| `idea-` | 新機能アイデア | `2026-02-24-idea-ai-image-generation.md` |
| `research-` | 技術調査 | `2026-02-24-research-vector-database.md` |
| `refactor-` | リファクタリング候補 | `2026-02-26-refactor-chat-component.md` |
| `improve-` | 改善案 | `2026-02-26-improve-performance-caching.md` |
| `todo-` | 実装中の保留タスク | `2026-02-26-todo-error-handling-cleanup.md` |
| `issue-` | 実装中に発見した問題 | `2026-02-27-issue-memory-leak-in-streaming.md` |
| `ci-` | CI/CD関連の問題 | `2026-02-27-ci-test-failures.md` |

---

## 📊 優先度ラベル

各ファイルの先頭に優先度を記載：

```markdown
> **優先度**: 🔴 高 / 🟡 中 / 🟢 低
> **状態**: 検討中 / 調査中 / 保留
> **関連**: plans/xxx.md（実装決定時に記載）
```

| ラベル | 意味 | 対応タイミング |
|-------|------|--------------|
| 🔴 高 | 近いうちに対応すべき | 1-2週間以内に検討 |
| 🟡 中 | 余裕がある時に対応 | 1ヶ月以内に検討 |
| 🟢 低 | いつか対応したい | 随時 |
| ⏸️ 保留 | 実装中に後回しにした | 次のスプリント or 随時 |

---

## 🔍 管理コマンド

```bash
# 優先度別にファイルを確認
grep -l "🔴 高" docs/backlog/*.md
grep -l "🟡 中" docs/backlog/*.md
grep -l "🟢 低" docs/backlog/*.md
grep -l "⏸️ 保留" docs/backlog/*.md

# 長期間更新されていないファイルを確認
find docs/backlog/ -name "*.md" -mtime +30

# plans/ へ移動（実装決定時）
mv docs/backlog/idea-xxx.md docs/plans/xxx.md

# archive/ へ移動（優先度低下時）
mv docs/backlog/idea-xxx.md "docs/archive/$(date +%Y-%m-%d)-idea-xxx.md"

# 実装中に保留タスクを作成
echo "# TODO: エラーハンドリングの改善\n\n> **優先度**: ⏸️ 保留\n> **発見日**: $(date +"%Y-%m-%d")\n> **関連ファイル": app/api/xxx/route.ts\n\n## 内容\n\n..." > "docs/backlog/todo-error-handling.md"
```

---

## 📁 現在のBacklog

| ファイル | 種別 | 優先度 | 状態 | 概要 |
|---------|------|-------|------|------|
| [2026-02-24-idea-sns-research-agent.md](./2026-02-24-idea-sns-research-agent.md) | 新機能 | 🟡 中 | 検討中 | SNS人物探索エージェント（xAI直接API使用） |
| [2026-02-24-idea-sns-research-agent-ui.md](./2026-02-24-idea-sns-research-agent-ui.md) | 新機能 | 🟢 低 | 検討中 | Gen Spark風カードベース進捗表示UI |
| [research-supabase-migration.md](./research-supabase-migration.md) | 技術選定 | 🔴 高 | 完了 | Supabase認証・DB移行完了 |
| [research-llm-api-tools-comparison.md](./research-llm-api-tools-comparison.md) | 技術調査 | 🟢 低 | 完了 | xAI直接API採用決定 |

---

## 📝 実装中の保留タスク・イシューの記録方法

実装中に「後で対応したい」タスクや問題を発見したら：

### 1. 即座にファイルを作成

```bash
# 保留タスクの場合（作成日を先頭に）
cat > "docs/backlog/$(date +%Y-%m-%d)-todo-brief-description.md" << 'EOF'
> **優先度**: ⏸️ 保留
> **発見日**: YYYY-MM-DD
> **発見者**: @username
> **関連ファイル**: app/path/to/file.ts
> **関連PR**: #123（あれば）

# TODO: タイトル

## 内容

実装中に後回しにしたタスクの詳細

## 対応時期

- [ ] 次のスプリント
- [ ] リリース後
- [ ] 随時

## 関連コード

```typescript
// TODO: [優先度] 説明
// 現在の一時的な実装
```
EOF
```

### 2. コードに TODO コメントを残す

```typescript
// TODO: [高] エラーハンドリングの改善
// backlog/todo-error-handling-cleanup.md を参照
// 現在は簡易的な実装
```

### 3. 定期的な見直し

毎週またはスプリント終了時に `backlog/` を確認：

```bash
# 保留タスク一覧
grep -l "⏸️ 保留" docs/backlog/*.md

# 古い保留タスクを確認
find docs/backlog/ -name "todo-*.md" -mtime +14
```

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
