# Agent Swarm コミュニケーションログ

> **全てのエージェント間通信はタイムコード付きで記録すること**
> **後から時系列で可視化・分析できるようにするため**

---

## 📝 ログファイル命名

```
logs/{YYYYMMDD-HHMMSS}-{agent-name}.md

例:
- logs/20260215-103042-orchestrator.md
- logs/20260215-103845-ui-research.md
- logs/20260215-114230-llm-gemini.md
```

---

## 🕐 タイムコード形式

```
[YYYY-MM-DD HH:MM:SS.mmm ±TZ] [AGENT] [TYPE] メッセージ

例:
[2026-02-15 10:30:42.123 +09:00] [ORCHESTRATOR] [COMMAND] ui-researchを起動
[2026-02-15 10:30:45.456 +09:00] [UI-RESEARCH] [INIT] UI分析を開始
[2026-02-15 10:35:12.789 +09:00] [UI-RESEARCH] [PROGRESS] 画像3/5完了
```

---

## 📊 メッセージ種別（TYPE）

| 種別 | 用途 |
|------|------|
| [INIT] | セッション開始 |
| [COMMAND] | 命令・指示 |
| [RESPONSE] | 応答・完了報告 |
| [QUERY] | 他エージェントへの問い合わせ |
| [ANSWER] | 問い合わせへの回答 |
| [PROGRESS] | 進捗報告（15分ごと） |
| [BLOCKED] | 停滞・待機 |
| [ERROR] | エラー発生 |
| [WARNING] | 警告 |
| [ARTIFACT] | 成果物提出 |
| [COMPLETE] | タスク完了 |
| [DEPENDENCY] | 依存関係の宣言・解決 |

---

## 📈 時系列可視化（後で分析用）

ログが蓄積したら、以下の可視化が可能：

### 1. タイムラインチャート

```
時間 →
[10:30] [ORCHESTRATOR] COMMAND → ui-research起動
[10:31] [UI-RESEARCH] INIT → 開始
[10:35] [UI-RESEARCH] PROGRESS → 60%
[10:40] [UI-RESEARCH] ARTIFACT → 成果物提出
[10:41] [UI-RESEARCH] COMPLETE → 完了
[10:42] [ORCHESTRATOR] COMMAND → design-system起動
```

### 2. 依存関係グラフ

```
ui-research ───┬──→ design-system
               │
db-schema ─────┼──→ auth-api
               │
               └──→ llm-gemini
```

### 3. 並列実行の可視化

```
時間軸:
10:30 ──────────────────────────────────────> 11:00

ui-research: [=======完了======]
db-schema:   [=========完了==========]
                         design-system: [======完了=====]
                         auth-api:      [=========完了=========]
                                      llm-gemini:    [=========完了=========]
                                      drive:         [=====完了=====]
                                                     pj-c-research:  [=======進行中=======]
```

---

## 📝 ログエントリテンプレート

[template.md](template.md) を参照

---

## 🔍 ログ解析コマンド（後で使用）

```bash
# 全ログを時系列で統合
cat logs/*.md | sort

# 特定エージェントの追跡
grep "UI-RESEARCH" logs/*.md

# 依存関係の抽出
grep "\[DEPENDENCY\]" logs/*.md

# エラーの抽出
grep "\[ERROR\]" logs/*.md

# タイムライン生成（後でスクリプト化）
./scripts/generate-timeline.sh logs/
```

---

## ✅ ログ記録義務

### 全エージェント共通

- [ ] セッション開始時: [INIT]
- [ ] 15分ごとまたは進捗あり: [PROGRESS]
- [ ] 他エージェント通信: [QUERY] / [ANSWER]
- [ ] 成果物作成: [ARTIFACT]
- [ ] タスク完了: [COMPLETE]
- [ ] エラー発生: [ERROR]

---

**厳密に記録し、後から分析・可視化できるようにすること**
