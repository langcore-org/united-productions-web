---
name: db-query
description: Prismaを使ってデータベースを照会・確認する汎用スキル。プロンプト内容確認、機能紐付け確認、ユーザー使用状況確認、削除前の関連データ確認など。任意のテーブル・レコード・スキーマ・リレーションを確認可能。Triggers include "DBを確認", "データベースを確認", "テーブルを確認", "レコードを見る", "スキーマを確認", "Prismaで確認", "プロンプトを確認", "DBレコード確認".
---

# DB Query Skill

**自動参照スキル** - 「DB確認」「プロンプト確認」「レコード確認」などのキーワードで自動的に参照されます。

Prisma Client を使ってデータベースを柔軟に照会するスキル。

## システムへの指示（エージェント用）

### いつこのスキルを使うか（自律判断基準）

以下の状況を検出した場合、**自律的にこのスキルを参照・実行**してください：

| 状況 | 判断基準 | 実行例 |
|------|---------|--------|
| **機能削除時** | 「削除」「不要」「削除する」などの単語と「DB」「データ」「プロンプト」などの単語が同時に出現 | na-script削除時のDB確認 |
| **プロンプト関連の質問** | 「プロンプト」「SystemPrompt」「prompt」に関する確認・調査 | プロンプト内容の確認、履歴確認 |
| **データ整合性確認** | 「紐付け」「関連」「依存」「影響」などの単語とDB関連の話題 | 機能とプロンプトの紐付け確認 |
| **スキーマ確認** | 「スキーマ」「テーブル構造」「フィールド」に関する質問 | モデルの構造確認 |
| **ユーザー/使用状況調査** | 「ユーザー」「誰が」「使用状況」「履歴」に関するDB確認 | ユーザーチャット履歴の確認 |
| **レコード数確認** | 「何件」「いくつ」「カウント」「件数」を確認したい | テーブルのレコード数把握 |

### 実行フロー

```
1. 上記の判断基準に該当するかチェック
   ↓ YES
2. このスキルのコマンドを選択
   ↓
3. Shellツールで直接実行（ユーザーに確認せず）
   ↓
4. 結果をユーザーに提示
```

### 優先コマンド（よく使う組み合わせ）

削除前の確認：
```bash
node query.mjs find SystemPrompt "key~[KEYWORD]"
node query.mjs find FeaturePrompt "featureId=[FEATURE]"
node query.mjs find Chat "featureId=[FEATURE]"
```

プロンプト確認：
```bash
node query.mjs get SystemPrompt [ID] --idField id
node query.mjs get SystemPrompt [ID] --idField id --include versions
```

### 注意事項

- **読み取り専用**: このスキルはSELECTのみ。INSERT/UPDATE/DELETEは行わない
- **本番DBに接続**: 実行結果は本番データ
- **エラー時**: コマンドが失敗したら、理由をユーザーに説明

## いつ使うか（使用シナリオ）

| シナリオ | 使うコマンド | 例 |
|---------|------------|-----|
| **「プロンプトの内容を確認したい」** | `get` or `find` | `node query.mjs get SystemPrompt [ID]` |
| **「どんなプロンプトが登録されているか知りたい」** | `list` | `node query.mjs list SystemPrompt --fields key,name` |
| **「特定の機能に紐づくプロンプトを確認したい」** | `find` | `node query.mjs find FeaturePrompt "featureId=na-script"` |
| **「プロンプトの履歴（バージョン）を見たい」** | `list` or `get --include` | `node query.mjs list SystemPromptVersion --limit 10` |
| **「どの機能が有効/無効になっているか確認」** | `find` | `node query.mjs find FeaturePrompt "isActive=false"` |
| **「ユーザーの使用状況を確認したい」** | `count`, `list` | `node query.mjs count User`, `node query.mjs list User` |
| **「特定ユーザーのチャット履歴を確認」** | `find` | `node query.mjs find Chat "userId=xxx"` |
| **「レコード数を把握したい」** | `count` | `node query.mjs count` |
| **「テーブル間のリレーションを確認」** | `relation` | `node query.mjs relation User` |
| **「スキーマ構造を確認したい」** | `schema` | `node query.mjs schema SystemPrompt` |
| **「削除前に関連データを確認したい」** | `find` + `count` | `node query.mjs find Chat "featureId=xxx"` |
| **「機能の使用状況（集計）を確認」** | `find` + `count` | `node query.mjs count Chat` |

### 実際の使用例

```bash
# na-script機能のプロンプトを確認したい
node query.mjs find SystemPrompt "key~TRANSCRIPT"
# → TRANSCRIPTとTRANSCRIPT_FORMATの2件が表示される

# na-script機能の紐付けを確認したい
node query.mjs find FeaturePrompt "featureId=na-script"
# → featureId: na-script, promptKey: TRANSCRIPT が表示される

# ユーザーが何人いるか確認
node query.mjs count User

# 最近更新されたプロンプトを確認
node query.mjs list SystemPrompt --order updatedAt --desc --limit 5

# プロンプトのバージョン履歴を確認
node query.mjs get SystemPrompt [ID] --include versions
```

## 開発ワークフローでの使用例

### 機能削除時（na-script削除など）

```bash
# 1. 削除対象のプロンプトを確認
node query.mjs find SystemPrompt "key~TRANSCRIPT"

# 2. 機能の紐付けを確認
node query.mjs find FeaturePrompt "featureId=na-script"

# 3. 関連データ（チャット履歴など）が存在するか確認
node query.mjs count Chat
node query.mjs find Chat "featureId=na-script"

# 4. 削除後にDBデータが残っているか確認
node query.mjs find SystemPrompt "key=TRANSCRIPT"
```

### プロンプト調整時

```bash
# 1. 現在のプロンプト内容を確認
node query.mjs get SystemPrompt prompt_minutes --idField id

# 2. バージョン履歴を確認
node query.mjs get SystemPrompt prompt_minutes --idField id --include versions

# 3. 特定の変更を探す
node query.mjs list SystemPromptVersion --fields version,changeNote,createdAt --limit 5

# 4. 更新後に反映されているか確認
node query.mjs get SystemPrompt prompt_minutes --idField id --fields key,currentVersion,updatedAt
```

### ユーザー対応時

```bash
# 1. ユーザー情報を確認
node query.mjs find User "email=user@example.com"

# 2. ユーザーのチャット履歴を確認
node query.mjs find Chat "userId=xxx" --limit 10 --order createdAt --desc

# 3. 特定のチャット内容を確認
node query.mjs get Chat [CHAT_ID]
```

### データ移行・バックアップ時

```bash
# 1. テーブルサイズを把握
node query.mjs count

# 2. 特定カテゴリのデータを抽出
node query.mjs find SystemPrompt "category=research" --fields key,name

# 3. スキーマ構造を確認
node query.mjs schema SystemPrompt

# 4. リレーションを確認
node query.mjs relation Chat
```

## クイックスタート

```bash
# 利用可能なテーブル一覧を表示
node .claude/skills/db-query/scripts/query.mjs tables

# テーブルのレコード数を確認
node .claude/skills/db-query/scripts/query.mjs count [MODEL]

# レコード一覧を表示（基本）
node .claude/skills/db-query/scripts/query.mjs list [MODEL] [OPTIONS]

# 特定レコードの詳細を表示
node .claude/skills/db-query/scripts/query.mjs get [MODEL] [ID]

# WHERE条件で検索
node .claude/skills/db-query/scripts/query.mjs find [MODEL] [CONDITIONS]
```

## 利用可能なテーブル（Prisma Model）

| モデル名 | 説明 | 主なフィールド |
|---------|------|--------------|
| `SystemPrompt` | システムプロンプト | key, name, content, category, isActive, currentVersion |
| `FeaturePrompt` | 機能とプロンプトの紐付け | featureId, promptKey, isActive |
| `User` | ユーザー情報 | name, email, role, isActive |
| `Session` | 認証セッション | userId, expires |
| `Chat` | チャット履歴 | userId, title, featureId, createdAt |
| `ChatMessage` | チャットメッセージ | chatId, role, content |
| `MeetingNote` | 議事録 | userId, title, content, sourceType |
| `Transcript` | 書き起こしデータ | userId, title, content, source |
| `ResearchChat` | リサーチチャット | userId, title, agentType |
| `Schedule` | スケジュール | userId, title, date, location |
| `LocationSchedule` | ロケスケジュール | scheduleId, title, date, location |
| `SystemPromptVersion` | プロンプト履歴 | promptId, version, content |

## コマンド詳細

### 1. tables - テーブル一覧

```bash
node .claude/skills/db-query/scripts/query.mjs tables
```

### 2. count - レコード数確認

```bash
# 全テーブルのレコード数
node .claude/skills/db-query/scripts/query.mjs count

# 特定テーブルのみ
node .claude/skills/db-query/scripts/query.mjs count SystemPrompt
node .claude/skills/db-query/scripts/query.mjs count User
```

### 3. list - レコード一覧

```bash
# 基本（最新20件）
node .claude/skills/db-query/scripts/query.mjs list SystemPrompt

# 件数指定
node .claude/skills/db-query/scripts/query.mjs list SystemPrompt --limit 10

# フィールド選択
node .claude/skills/db-query/scripts/query.mjs list SystemPrompt --fields key,name,isActive

# ソート順指定
node .claude/skills/db-query/scripts/query.mjs list SystemPrompt --order createdAt --desc

# 複合条件
node .claude/skills/db-query/scripts/query.mjs list SystemPrompt --limit 5 --fields key,name,category --order updatedAt --desc
```

### 4. get - 特定レコードの詳細

```bash
# ID指定で取得
node .claude/skills/db-query/scripts/query.mjs get SystemPrompt prompt_transcript

# 関連データも含める（リレーション）
node .claude/skills/db-query/scripts/query.mjs get SystemPrompt prompt_transcript --include versions

# カスタムIDフィールド
node .claude/skills/db-query/scripts/query.mjs get FeaturePrompt fp_na_script --idField id
```

### 5. find - 条件検索

```bash
# 単一条件
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt 'category=transcript'
node .claude/skills/db-query/scripts/query.mjs find User 'role=ADMIN'

# 複数条件（AND）
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt 'category=transcript,isActive=true'

# 部分一致（contains）
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt 'key~TRANSCRIPT'

# 複合条件
node .claude/skills/db-query/scripts/query.mjs find Chat 'featureId=na-script' --limit 10 --order createdAt --desc
```

### 6. schema - スキーマ確認

```bash
# 全モデルのフィールド一覧
node .claude/skills/db-query/scripts/query.mjs schema

# 特定モデルの詳細
node .claude/skills/db-query/scripts/query.mjs schema SystemPrompt

# フィールドタイプも表示
node .claude/skills/db-query/scripts/query.mjs schema SystemPrompt --detailed
```

### 7. relation - リレーション確認

```bash
# モデルのリレーション一覧
node .claude/skills/db-query/scripts/query.mjs relation SystemPrompt

# 関連データを含めて取得
node .claude/skills/db-query/scripts/query.mjs get User [ID] --include Chat
```

## よく使うパターン

### プロンプト関連

```bash
# TRANSCRIPT関連のプロンプトを確認
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt 'key~TRANSCRIPT'

# 非アクティブなプロンプトを確認
node .claude/skills/db-query/scripts/query.mjs find SystemPrompt 'isActive=false'

# プロンプトの履歴を確認
node .claude/skills/db-query/scripts/query.mjs list SystemPromptVersion --fields version,changeNote,createdAt --limit 5
```

### ユーザー関連

```bash
# 管理者ユーザーを確認
node .claude/skills/db-query/scripts/query.mjs find User 'role=ADMIN'

# 最近ログインしたユーザー
node .claude/skills/db-query/scripts/query.mjs list User --order lastLoginAt --desc --limit 10

# 特定ユーザーのチャット履歴
node .claude/skills/db-query/scripts/query.mjs find Chat 'userId=[USER_ID]' --limit 5
```

### 機能関連

```bash
# na-script機能の紐付けを確認
node .claude/skills/db-query/scripts/query.mjs find FeaturePrompt 'featureId=na-script'

# 全機能一覧
node .claude/skills/db-query/scripts/query.mjs list FeaturePrompt --fields featureId,promptKey,isActive

# チャット機能別の使用状況
node .claude/skills/db-query/scripts/query.mjs count Chat
node .claude/skills/db-query/scripts/query.mjs find Chat 'featureId=na-script' --limit 5
```

## オプション一覧

| オプション | 説明 | 使用例 |
|-----------|------|--------|
| `--limit N` | 取得件数を指定 | `--limit 10` |
| `--fields a,b,c` | 表示フィールドを指定 | `--fields key,name` |
| `--order FIELD` | ソートフィールドを指定 | `--order createdAt` |
| `--desc` | 降順ソート | `--order createdAt --desc` |
| `--include REL` | リレーションデータを含める | `--include versions` |
| `--idField NAME` | IDフィールド名を指定 | `--idField key` |

## 検索条件の書き方

```
'field=value'           # 完全一致
'field~value'           # 部分一致（contains）
'field!=value'          # 不一致
'field>null'            # より大きい
'field>=2024-01-01'     # 以上（日付）
'field=true'            # 真偽値
'field=null'            # NULL判定
'f1=v1,f2=v2'           # AND条件
```
