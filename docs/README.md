# UPエージェント - ドキュメントガイド

> **本ディレクトリは「UPエージェント」（AI Hub）開発用のドキュメント群です。**
> **エージェントは必要に応じて随時作成・統合・分割してください。**

---

## 📁 ドキュメント構成

```
docs/
├── README.md                    # 本ファイル
├── initial_dev/                 # 今回の初回実装用
│   ├── agent-swarm-guide.md    # Agent Swarm並列開発ガイド⭐
│   ├── initial_dev_plan.md     # 要件定義・仕様書
│   └── llm-integration.md      # LLM統合設計
│
├── logs/                        # エージェント通信ログ
│   ├── README.md               # ログ仕様
│   └── template.md             # ログテンプレート
│
├── archive/                     # 過去資料・アーカイブ
│   ├── technical-review-20260215.md  # 技術設計レビュー
│   ├── 2〜4月ロードマップ.md
│   ├── LC開発プラン.md
│   ├── ロケスケ香盤車両表_ウェブアプリ実装プラン.md
│   ├── 今後のプラン.md
│   ├── 業務洗い出しとソリューション.md
│   └── リサーチ考査チャットアプリ_実装プラン.md
│
└── assets/                      # 参考資料
    ├── excels_and_words/       # 業務資料
    │   ├── 構成資料/
    │   ├── 議事録/
    │   └── リサーチ資料/
    └── images/                 # UI参考画像
```

---

## 🚀 クイックスタート

### 1. Agent Swarm 開発ガイド（必読）

本プロジェクトは**複数エージェントを並列起動**して開発を進めます：
- 📘 **[`initial_dev/agent-swarm-guide.md`](initial_dev/agent-swarm-guide.md)** - 並列開発の進め方、エージェントの役割、依存関係の管理

### 2. 要件確認

以下を読んでください：
- [`initial_dev/initial_dev_plan.md`](initial_dev/initial_dev_plan.md) - 要件定義・仕様書
- [`initial_dev/llm-integration.md`](initial_dev/llm-integration.md) - LLM統合設計
- [`archive/technical-review-20260215.md`](archive/technical-review-20260215.md) - 技術設計レビュー

### 2. エージェント起動

必要なエージェントを随時作成・起動してください。

**基本方針：**
- 「依存関係が解決できれば即座に開始」
- 「並列で最大限進めて早く完成させる」
- 「必要に応じてエージェントを統合・分割」

### 3. ログ記録

全てのやり取りはタイムコード付きで記録：
- [`logs/README.md`](logs/README.md) - ログ仕様
- [`logs/template.md`](logs/template.md) - テンプレート

---

## 📝 エージェント命名規則

必要に応じて以下のように命名してください：

```
{目的}-{詳細}

例:
- ui-research
- design-system
- database-schema
- auth-api
- llm-gemini
- llm-grok
- pj-c-research
- pj-c-people-search
- pj-a-meeting
- pj-b-transcript
- pj-d-schedule
- testing
- docs
```

**統合・分割の例：**
- `ui-research` + `design-system` → `ui-design`（統合）
- `pj-a-meeting` → `pj-a-input` + `pj-a-format`（分割）

---

## 🔗 参照ルール

1. **必ず読む**: [`initial_dev/initial_dev_plan.md`](initial_dev/initial_dev_plan.md)
2. **ログ仕様**: [`logs/README.md`](logs/README.md)
3. **技術レビュー**: [`archive/technical-review-20260215.md`](archive/technical-review-20260215.md)
4. **過去資料**: [`archive/`](archive/)

---

**目標: 並列で最大限進めて、早く完成させること**
