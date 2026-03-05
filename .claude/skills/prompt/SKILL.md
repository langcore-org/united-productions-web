# Prompt Engineering & Tuning

> **プロンプト設計とチューニング統合スキル**

## Description

システムプロンプトの設計、改善、テストケース駆動でのチューニングを行う統合スキル。

## When to use

- システムプロンプトの新規作成
- 既存プロンプトの改善・最適化
- テストケース駆動でのチューニング
- プロンプトバージョン管理

## Best Practices

### Prompt Design

- 明確な役割定義（「あなたは〜です」）
- 具体的な出力フォーマット指定
- 思考プロセスと最終出力の分離
- 例示（few-shot）の適切な使用
- 制約条件の明確化

### Testing Strategy

- シングルターンとマルチターンの両方をテスト
- 実際のユースケースに基づくテスト設計
- エッジケースの考慮
- 定量的な評価軸の設定

### Version Management

- DBでのバージョン管理
- 変更理由の記録
- 履歴の追跡可能な状態維持

## Tuning Workflow

```
Step 1: セッション開始
  └─ プロンプト選択 → 現状分析 → 評価軸設定

Step 2: テストケース設計
  └─ 既存テストの確認 or 新規作成

Step 3: 評価実行
  └─ 各テストケースを評価（1〜5点採点）

Step 4: 改善案提案
  └─ 失敗ケースの分析 → draft.md 更新

Step 5: 本番反映
  └─ 承認後、DBに新バージョンとして保存
```

## Quick Commands

```bash
# チューニングセッション開始
node prompt-tuning/scripts/init-session.mjs <KEY>

# 結果保存
node prompt-tuning/scripts/save-result.mjs '<JSON>'

# 本番反映
node prompt-tuning/scripts/approve.mjs <KEY> "<変更理由>"
```

## References

- prompt-tuning/WORKFLOW.md
