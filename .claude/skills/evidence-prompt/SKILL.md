---
name: evidence-prompt
description: エビデンスリサーチプロンプト（RESEARCH_EVIDENCE）の設計・改善・チューニング。実APIテストによる検証とユーザーフィードバックを組み合わせた柔軟な反復改善をサポート。
---

# Evidence Prompt Engineering

> **エビデンスリサーチプロンプトの設計・改善統合スキル**

## Description

`docs/prompts/RESEARCH_EVIDENCE.md` の設計・改善・テストを行うスキル。
実際の xAI API（`grok-4-1-fast-reasoning`）を使ってプロンプトを検証し、ユーザーとの対話を通じて柔軟に改善を進める。

## When to use

- RESEARCH_EVIDENCE プロンプトの新規設計・全面改訂
- 出力フォーマット・判定ラベル・トーンなどの部分改善
- 特定のクレームタイプ（科学・芸能・社会系など）に対する品質向上
- 別のクエリでの動作確認・回帰テスト

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `docs/prompts/RESEARCH_EVIDENCE.md` | 本番プロンプト（常にここを直接編集） |
| `scripts/test-research-evidence.mjs` | APIテストスクリプト（引数でクエリを変更可能） |

---

## ワークフロー

### Step 1: 現状把握

まず以下を実行して現状を確認します：

```bash
# 現在のプロンプトを読む
Read: docs/prompts/RESEARCH_EVIDENCE.md

# テストスクリプトの存在確認
Glob: scripts/test-research-evidence.mjs
```

プロンプトを読んだ上で、ユーザーに現状の課題認識を聞きます：

```
現在の RESEARCH_EVIDENCE プロンプトを確認しました。
改善したい点や気になっている出力の問題を教えてください。
（例：出力フォーマット、判定ラベル、引用の扱い、ツール使用など）
```

`$ARGUMENTS` に改善要望が直接指定されている場合はこの質問をスキップします。

---

### Step 2: 改善内容の合意

ユーザーの要望を受けて、変更内容を整理して確認します：

```
以下の変更を加えます。よろしいですか？

【変更点】
1. （変更内容A）
2. （変更内容B）
...

【変更しない点】
- （現状維持する要素）
```

ユーザーが「OK」または修正指示を出したら Step 3 へ進みます。

---

### Step 3: プロンプト更新

`docs/prompts/RESEARCH_EVIDENCE.md` を Edit ツールで更新します。

**編集の原則：**
- 合意した変更のみを加える（それ以外はいじらない）
- 出力フォーマットのサンプルは必ず具体的に記述する
- 判定ラベルは「ラベル名 — 使用条件」の形式で定義する
- ツール指示は用途を明記する（何のためにどのツールを使うか）
- 検証手順（内部で実行）は Claude 自身への指示として記述する

---

### Step 4: テスト実行

更新後すぐに実際の API でテストします：

```bash
node scripts/test-research-evidence.mjs "<テストクエリ>"
```

**テストクエリの選び方：**
- 今回の変更を最もよく検証できるクエリを選ぶ
- ユーザーが例示したクエリがあればそれを優先する
- 変更内容に応じてクエリのジャンルを変える

| 検証したい変更 | 推奨クエリジャンル |
|--------------|-----------------|
| 英語引用の日本語訳 | 科学・健康系（英語論文が出やすい） |
| 複数ソース引用 | 統計・社会系（多数の情報源が存在） |
| 風説ラベル | 芸能・SNS噂系 |
| X検索の活用 | 時事・芸能系 |
| 次会話誘導 | 任意 |

---

### Step 5: 結果の評価・フィードバック

テスト結果をユーザーと一緒に評価します。以下の観点を確認します：

**フォーマット面**
- [ ] セクション構造（`# 検証対象の情報` → `# 検証対象の分解` → `# 検証結果` → `# 参考ソース一覧` → 誘導文）
- [ ] 各クレームに参考資料①②... が付いているか
- [ ] 英語引用に日本語訳が付いているか
- [ ] 判定ラベルが適切か

**品質面**
- [ ] クレームの分解が適切か（細かすぎ・大きすぎないか）
- [ ] ロジックの記述が納得感あるか
- [ ] 参考資料が信頼できる一次情報源か
- [ ] 次会話誘導が自然か

テスト後に以下の形式でユーザーに確認します：

```
テスト結果を確認しました。

【良い点】
- （うまくいっている点）

【気になる点】
- （改善余地がある点）

追加で直したい箇所はありますか？
別のクエリでテストしたい場合はクエリを教えてください。
```

---

### Step 6: 反復改善（必要に応じて）

Step 2 〜 Step 5 を繰り返します。

**ループの終了条件：**
- ユーザーが「OK」「これで良い」「DBに反映して」などの意思を示す
- ユーザーが「別のプロンプトに移る」と言う

**複数クエリでのテスト推奨タイミング：**
- 判定ラベルを追加・変更したとき（異なるジャンルで正しく使い分けるか確認）
- ツール使用の指示を変更したとき（X検索が起動するか確認）
- 大きな構造変更を加えたとき（回帰テスト）

---

### Step 7: DB反映

ユーザーが承認したら Supabase MCP で直接 DB を更新します。
（`approve.mjs` は `draft.md` を経由する設計のため使用しない）

反映前に変更理由をユーザーに確認します：

```
DB に反映します。変更理由のメモを確認してください：

「（変更内容の要約）」

このメモで反映してよろしいですか？
```

確認が取れたら以下の順で SQL を実行します：

**1. バージョン履歴を追加**
```sql
INSERT INTO system_prompt_versions (prompt_id, version, content, changed_by, change_note)
VALUES (
  '<prompt_id>',
  <new_version>,
  '<プロンプト内容>',
  NULL,
  '<変更理由>'
);
```

**2. 本体を更新**
```sql
UPDATE system_prompts
SET
  content = (SELECT content FROM system_prompt_versions WHERE prompt_id = '<prompt_id>' AND version = <new_version>),
  current_version = <new_version>,
  change_note = '<変更理由>',
  changed_by = NULL
WHERE key = 'RESEARCH_EVIDENCE'
RETURNING key, current_version, change_note;
```

> `prompt_id` と現在の `current_version` は事前に `SELECT id, current_version FROM system_prompts WHERE key = 'RESEARCH_EVIDENCE'` で確認する。

---

## テストスクリプトの仕様

`scripts/test-research-evidence.mjs` の動作：

```bash
# デフォルトクエリ（引数なし）
node scripts/test-research-evidence.mjs

# カスタムクエリ
node scripts/test-research-evidence.mjs "検証したいクレーム文"
```

**出力内容：**
- モデル・ツール設定の確認
- AI の応答テキスト（フォーマット通りか確認）
- 使用トークン数・Web検索回数・X検索回数

**注意：**
- `.env.local` から `XAI_API_KEY` を自動取得
- モデル: `grok-4-1-fast-reasoning`
- ツール: `web_search` + `x_search`
- タイムアウト: 120秒（reasoning モデルのため長め）

---

## プロンプト設計のガイドライン

### 出力フォーマット
- Markdown のコードブロック内に具体的なサンプルを入れる
- セクション名・記号・インデントも含めて明示する
- 「※〇〇の場合は〜」のような条件分岐は注釈として直接フォーマット内に書く

### 判定ラベル
- ラベル名は短く、意味が直感的に分かるものにする
- 各ラベルに「— いつ使うか」を定義する
- 科学系と一般系でラベルを使い分けられるようにする

### ツール指示
- `Web検索` と `X（旧Twitter）検索` の使い分けを明記する
- 「何のために検索するか」（論文探索・リアルタイム確認など）を書く

### 検証手順（内部で実行セクション）
- ステップ番号付きで記述する
- クレームのジャンル別に適切な情報源を示す
- 「最低N件以上」など定量的な指示を入れる

---

## Quick Commands

```bash
# デフォルトクエリでテスト
node scripts/test-research-evidence.mjs

# カスタムクエリでテスト
node scripts/test-research-evidence.mjs "テストしたいクレーム"

# DB反映
node prompt-tuning/scripts/approve.mjs RESEARCH_EVIDENCE "<変更理由>"
```

## References

- `docs/prompts/RESEARCH_EVIDENCE.md` — 本番プロンプト
- `scripts/test-research-evidence.mjs` — テストスクリプト
- `.claude/skills/prompt/SKILL.md` — 汎用プロンプトチューニングスキル（マルチプロンプト対応の親スキル）
