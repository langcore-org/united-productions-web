# Backlog（検討・調査・将来対応）

> **いつか対応すべきこと、検討・調査段階のアイデアを管理**
> 
> **最終更新**: 2026-02-24 13:15

---

## 📋 このディレクトリの目的

`backlog/` は以下を管理する場所：

| 種別 | 説明 | 例 |
|-----|------|-----|
| **検討段階** | 実装するか未定のアイデア | 新機能の提案 |
| **調査段階** | 技術調査が必要な項目 | 新ライブラリの評価 |
| **将来対応** | 優先度低いが対応したい項目 | リファクタリング候補 |
| **参考資料** | 将来の判断材料になる情報 | 競合分析、技術記事 |

---

## 🔄 ライフサイクル

```
アイデア発生 → backlog/ に配置 → 検討・調査 → 実装決定 → plans/ に移動
                                    ↓
                              優先度低下 → archive/ に移動 or 削除
```

| ステータス | 場所 | 次のアクション |
|-----------|------|--------------|
| 検討・調査中 | `backlog/` | 継続検討 or `plans/` へ移動 |
| 実装決定 | `plans/` | 実装開始 |
| 優先度低下 | `archive/` | 参照のみ |

---

## 📝 ファイル命名規則

```
{カテゴリ}-{簡潔な説明}.md
```

| カテゴリ | 用途 | 例 |
|---------|------|-----|
| `idea-` | 新機能アイデア | `idea-ai-image-generation.md` |
| `research-` | 技術調査 | `research-vector-database.md` |
| `refactor-` | リファクタリング候補 | `refactor-chat-component.md` |
| `improve-` | 改善案 | `improve-performance-caching.md` |

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

---

## 🔍 管理コマンド

```bash
# 優先度別にファイルを確認
grep -l "🔴 高" docs/backlog/*.md
grep -l "🟡 中" docs/backlog/*.md
grep -l "🟢 低" docs/backlog/*.md

# 長期間更新されていないファイルを確認
find docs/backlog/ -name "*.md" -mtime +30

# plans/ へ移動（実装決定時）
mv docs/backlog/idea-xxx.md docs/plans/xxx.md

# archive/ へ移動（優先度低下時）
mv docs/backlog/idea-xxx.md "docs/archive/$(date +%Y-%m-%d)-idea-xxx.md"
```

---

## 📁 現在のBacklog

| ファイル | 種別 | 優先度 | 状態 | 概要 |
|---------|------|-------|------|------|
| [idea-sns-research-agent.md](./idea-sns-research-agent.md) | 新機能 | 🟡 中 | 検討中 | SNS人物探索エージェント（LangGraphワークフロー） |
| [idea-sns-research-agent-ui.md](./idea-sns-research-agent-ui.md) | 新機能 | 🟢 低 | 検討中 | Gen Spark風カードベース進捗表示UI |
