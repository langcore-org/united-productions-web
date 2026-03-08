# プロンプトチューニング ワークフロー

> どのエージェント（Claude Code / Kimi Code CLI / Cursor）でも同じ手順で作業できます。

---

## ディレクトリ構成

```
prompt-tuning/
├── WORKFLOW.md              ← このファイル
├── scripts/
│   ├── get.mjs              ← DBからプロンプト取得・確認
│   ├── init-session.mjs     ← セッション初期化（draft.md作成）
│   ├── save-result.mjs      ← 試行結果をhistory/に保存
│   └── approve.mjs          ← draft.mdを本番DBへ反映
└── <PROMPT_KEY>/
    ├── test-cases.md        ← テストケース定義（人間・エージェントが記述）
    ├── draft.md             ← チューニング中のプロンプト（上書き更新）
    └── history/
        ├── attempt-1_score-2-4.md
        ├── attempt-2_score-3-4.md
        └── attempt-3_score-4-4_APPROVED.md  ← 承認済み
```

---

## 利用可能なプロンプトキー

| キー | 機能 |
|------|------|
| `GENERAL_CHAT` | 汎用チャット |
| `MINUTES` | 議事録作成 |
| `MEETING_FORMAT_MEETING` | 議事録フォーマット（会議） |
| `MEETING_FORMAT_INTERVIEW` | 議事録フォーマット（取材） |
| `RESEARCH_CAST` | 出演者リサーチ |
| `RESEARCH_LOCATION` | 場所リサーチ |
| `RESEARCH_INFO` | 情報リサーチ |
| `RESEARCH_EVIDENCE` | エビデンスリサーチ |
| `PROPOSAL` | 新企画立案 |

---

## 作業フロー

### 1. セッション開始

```bash
node prompt-tuning/scripts/init-session.mjs <KEY>
```

- DBから本番プロンプトを取得して `<KEY>/draft.md` を作成
- `<KEY>/history/` ディレクトリを作成
- `<KEY>/test-cases.md` がなければテンプレートを生成

### 2. テストケース設計

`<KEY>/test-cases.md` を編集してテストケースを定義する。

```markdown
## テストケース1: [名前]

### 入力
[ユーザーが実際に入力するテキスト]

### 期待する出力の基準
- [基準1（必須）]
- [基準2（必須）]
- [基準3（あると良い）]

### 重み
必須
```

### 3. 評価（ループ）

エージェントが `draft.md` のプロンプトで各テストケースを評価し、結果をJSONで出力:

```bash
node prompt-tuning/scripts/save-result.mjs '<JSON>'
```

```json
{
  "key": "RESEARCH_CAST",
  "tests": [
    { "name": "テストケース名", "passed": true,  "note": "コメント" },
    { "name": "テストケース名", "passed": false, "note": "失敗理由" }
  ]
}
```

### 4. 改善・再評価

エージェントが `draft.md` を改善し、Step 3 に戻る。
スコアが上がるまで繰り返す。

### 5. 本番反映（承認）

```bash
node prompt-tuning/scripts/approve.mjs <KEY> "<変更理由>"
```

- `draft.md` の内容がDBに新バージョンとして保存される
- 最後の試行ファイルに `_APPROVED` が付く

---

## スクリプト一覧

| スクリプト | 用途 | 実行例 |
|-----------|------|--------|
| `get.mjs` | DBのプロンプトを確認 | `node prompt-tuning/scripts/get.mjs RESEARCH_CAST` |
| `init-session.mjs` | セッション初期化 | `node prompt-tuning/scripts/init-session.mjs RESEARCH_CAST` |
| `save-result.mjs` | 試行結果を保存 | `node prompt-tuning/scripts/save-result.mjs '{"key":"...","tests":[]}'` |
| `approve.mjs` | 本番DBへ反映 | `node prompt-tuning/scripts/approve.mjs RESEARCH_CAST "変更理由"` |

---

## Claude Codeで使う場合

```
/prompt-tuning RESEARCH_CAST
```

`.claude/skills/prompt-tuning/SKILL.md` に従って自動的にワークフローを実行します。

---

## 注意事項

- 複数エージェントが同じキーを同時にチューニングしないこと
- `draft.md` は承認前の作業ファイルです。本番への影響はありません
- 承認後も `draft.md` はそのまま残ります（次回セッションで継続可能）
