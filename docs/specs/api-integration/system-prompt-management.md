# システムプロンプト管理 実装プラン

> **DB管理・バージョン履歴・管理画面の設計方針**
>
> **作成日**: 2026-02-20

## 現状の整理

### 現在の構成

```
lib/prompts/
├── index.ts           # 統合エクスポート（DBファーストのフォールバック構成）
├── db.ts              # DB取得ユーティリティ + DEFAULT_PROMPTS（シードデータ）
├── minutes.ts         # プロンプト本文（コード管理）
├── research-cast.ts   # プロンプト本文（コード管理）
└── ...                # その他コード管理のプロンプト
```

`SystemPrompt` テーブルはすでに存在し、DB管理の基盤はある。
ただし **バージョン履歴機能は未実装**。

### 問題点

| 問題 | 現状 |
|------|------|
| プロンプトの二重管理 | コードとDBに重複して存在 |
| 変更履歴がない | `updatedAt` のみで差分不明 |
| 復元が困難 | 過去バージョンに戻す手段がない |
| 変更者不明 | 誰がいつ変更したか追跡できない |

---

## 推奨構成

### ソースコードにプロンプトを入れておく必要はあるか

**結論: シードデータとしてのみ残す。ランタイムのフォールバックとしては使わない。**

| ファイル | 役割 | 推奨 |
|---------|------|------|
| `lib/prompts/db.ts` 内の `DEFAULT_PROMPTS` | 初回デプロイ時のシード用初期値 | **残す** |
| `lib/prompts/minutes.ts` 等の個別プロンプトファイル | ランタイムフォールバック | **廃止方向** |

#### 理由

- DB を正とすることで「実際に動いているプロンプト」を管理画面で常に確認できる
- コードをフォールバックにすると「管理画面で変更したはずなのに DB 取得失敗時にコードの古い版が動く」という混乱が生じる
- DB 接続障害時の対策は「エラーを明示する」方が安全。サイレントフォールバックは意図しない動作の原因になる

#### 移行後の役割分担

```
lib/prompts/
├── db.ts              # DB取得ユーティリティ + 初期シードデータ（残す）
├── index.ts           # エクスポート（整理）
└── (minutes.ts 等)    # 段階的に廃止。シード完了後は削除可
```

---

## データベース設計

### 新規テーブル: `SystemPromptVersion`

```prisma
model SystemPromptVersion {
  id          String       @id @default(cuid())
  promptId    String                            // FK -> SystemPrompt.id
  prompt      SystemPrompt @relation(fields: [promptId], references: [id], onDelete: Cascade)
  version     Int                               // 連番（1, 2, 3...）
  content     String       @db.Text            // プロンプト本文（スナップショット）
  changedBy   String?                           // 変更者 UserId
  changeNote  String?                           // 変更理由・メモ（任意）
  createdAt   DateTime     @default(now())

  @@index([promptId, version])
  @@index([promptId, createdAt])
}
```

### `SystemPrompt` テーブルへの追加カラム

```prisma
model SystemPrompt {
  // ...既存カラム...
  currentVersion  Int      @default(1)          // 現在のバージョン番号
  changedBy       String?                        // 最終更新者 UserId
  changeNote      String?                        // 最終更新の理由メモ

  versions        SystemPromptVersion[]          // リレーション追加
}
```

### ER図（変更後）

```mermaid
erDiagram
    SystemPrompt ||--o{ SystemPromptVersion : "has"
    User ||--o{ SystemPromptVersion : "changes (optional)"

    SystemPrompt {
        string id PK
        string key UNIQUE
        string name
        string description
        string content
        string category
        bool isActive
        int currentVersion
        string changedBy
        string changeNote
        datetime createdAt
        datetime updatedAt
    }

    SystemPromptVersion {
        string id PK
        string promptId FK
        int version
        string content
        string changedBy
        string changeNote
        datetime createdAt
    }
```

### バージョニング動作

1. 初回登録 → `version = 1` の `SystemPromptVersion` レコードを同時作成
2. 更新時 → `currentVersion + 1` の新しい `SystemPromptVersion` を追加。`SystemPrompt.content` も更新
3. 復元時 → 指定バージョンの `content` で現在の `SystemPrompt` を上書き。新バージョン番号でレコード追加（「復元」ノート付き）

> **復元は新バージョンとして記録する**。`SystemPromptVersion` のレコードは削除・改変しない（監査証跡の保全）。

---

## API 設計

すべて `/api/admin/prompts/` 配下。管理者権限（`ADMIN` ロール、または指定ユーザー）のみアクセス可。

### エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/admin/prompts` | プロンプト一覧（カテゴリフィルタ対応） |
| `GET` | `/api/admin/prompts/[key]` | プロンプト詳細（現在のバージョン） |
| `PUT` | `/api/admin/prompts/[key]` | プロンプト更新（バージョン自動採番） |
| `GET` | `/api/admin/prompts/[key]/history` | バージョン履歴一覧 |
| `GET` | `/api/admin/prompts/[key]/history/[version]` | 特定バージョンの内容取得 |
| `POST` | `/api/admin/prompts/[key]/restore` | 指定バージョンに復元 |
| `GET` | `/api/admin/prompts/[key]/diff` | バージョン間の差分（オプション） |

### リクエスト/レスポンス例

#### `PUT /api/admin/prompts/MINUTES`
```json
// Request
{
  "content": "## 議事録作成\n...",
  "changeNote": "出力形式を追記"
}

// Response
{
  "key": "MINUTES",
  "version": 3,
  "content": "## 議事録作成\n...",
  "updatedAt": "2026-02-20T10:00:00Z"
}
```

#### `GET /api/admin/prompts/MINUTES/history`
```json
{
  "versions": [
    { "version": 3, "changedBy": "user@example.com", "changeNote": "出力形式を追記", "createdAt": "..." },
    { "version": 2, "changedBy": "user@example.com", "changeNote": "役割定義を修正", "createdAt": "..." },
    { "version": 1, "changedBy": null, "changeNote": "初期シード", "createdAt": "..." }
  ]
}
```

#### `POST /api/admin/prompts/MINUTES/restore`
```json
// Request
{ "version": 1, "changeNote": "v1に戻す（v2,3の変更が本番に影響したため）" }

// Response
{ "key": "MINUTES", "version": 4, "restoredFrom": 1 }
```

---

## 管理 UI 設計

### ページ構成

```
/admin/prompts                    # プロンプト一覧
/admin/prompts/[key]              # 詳細・編集
/admin/prompts/[key]/history      # バージョン履歴
/admin/prompts/[key]/history/[v]  # 特定バージョン参照
```

### 一覧ページ (`/admin/prompts`)

- カテゴリ別タブ（general / minutes / transcript / research / document）
- 各プロンプトカード: 名前・説明・現在バージョン・最終更新日・最終更新者
- 検索フィルタ（プロンプト名、キー）

### 詳細・編集ページ (`/admin/prompts/[key]`)

- プロンプト本文エディタ（モノスペースフォント、行番号表示推奨）
- 変更理由入力欄（任意テキスト、保存時に記録）
- 「保存」ボタン → バージョンがインクリメントされて保存
- 「履歴を見る」リンク → 履歴ページへ
- 現在のバージョン番号・最終更新者・最終更新日時を表示

### バージョン履歴ページ (`/admin/prompts/[key]/history`)

- バージョン一覧テーブル: バージョン番号・変更者・変更理由・日時
- 各行に「内容を見る」「このバージョンに復元」ボタン
- 復元時は確認モーダル（「バージョン X に戻します。現在の内容はバージョン Y として保存されます」）

### バージョン参照ページ (`/admin/prompts/[key]/history/[v]`)

- 指定バージョンの本文を読み取り専用表示
- 「このバージョンに復元」ボタン
- （オプション）現在バージョンとの差分表示（unified diff 形式）

---

## キャッシュ戦略

現行の「リクエストごとにDB取得」から、必要に応じて以下を検討。

| 戦略 | 推奨タイミング |
|------|---------------|
| キャッシュなし（現行） | 開発初期・プロンプト変更頻度が高い時期 |
| Next.js `unstable_cache` | プロンプト変更が月数回程度になった段階 |
| Redis キャッシュ | 大量リクエスト時のみ（現時点では不要） |

更新時のキャッシュ無効化：
- `PUT /api/admin/prompts/[key]` および `POST .../restore` のレスポンス前に該当キャッシュをパージ

---

## 権限設計

| 操作 | 必要権限 |
|------|---------|
| プロンプト参照（一覧・詳細） | 管理者のみ |
| プロンプト編集・保存 | 管理者のみ |
| 履歴参照 | 管理者のみ |
| バージョン復元 | 管理者のみ |

**管理者の定義**（推奨）: `User` テーブルに `role` カラム（`ADMIN` / `USER`）を追加。または特定メールアドレスのホワイトリスト方式（小規模チームなら後者が簡単）。

---

## 実装フェーズ

### Phase 1: DB 拡張とバージョン記録

1. `SystemPromptVersion` テーブルの追加マイグレーション
2. `SystemPrompt` への `currentVersion`, `changedBy`, `changeNote` 追加
3. 既存プロンプトへのバージョン1レコード自動作成（マイグレーションスクリプト）
4. `lib/prompts/db.ts` の更新処理にバージョン記録ロジック追加

### Phase 2: 管理 API

1. `/api/admin/prompts/` 配下のエンドポイント実装
2. 管理者権限ガード（middleware または API ルート内チェック）
3. 更新・復元 API のバージョニングロジック実装

### Phase 3: 管理 UI

1. `/admin/prompts` 一覧ページ
2. `/admin/prompts/[key]` 編集ページ
3. `/admin/prompts/[key]/history` 履歴ページ
4. 復元確認モーダル

### Phase 4: コードプロンプトの廃止

1. DB シードが正常に動作していることを確認
2. ランタイムフォールバックコードを「DB 取得失敗時はエラーを返す」に変更
3. `lib/prompts/minutes.ts` 等の個別ファイルを削除
4. `lib/prompts/index.ts` から個別ファイルのエクスポートを削除

> Phase 4 は Phase 1〜3 が安定稼働してから実施する。

---

## 留意事項

### プロンプトのシード（初期データ）

- `lib/prompts/db.ts` の `DEFAULT_PROMPTS` は引き続きシード専用として残す
- `seedPrompts()` は「テーブルが空の場合のみ実行」の現行ロジックを維持
- シード時に `version = 1` の `SystemPromptVersion` レコードも同時作成する

### 変更理由メモの運用

- 強制入力にはしない（任意）。空の場合は「-」として記録
- 「何のために変更したか」を残す文化を育てる目的

### バージョン上限

- 不要に古い履歴を保持し続けることへの対応は当面不要（テキストデータのため容量は軽い）
- 将来的に必要なら「直近 N バージョン保持」ポリシーを別途設ける

---

## 関連ファイル・ドキュメント

| 項目 | 参照先 |
|-----|--------|
| 現行 DB スキーマ | [database-schema.md](./database-schema.md) |
| プロンプト設計方針 | [prompt-engineering.md](./prompt-engineering.md) |
| 認証・認可 | [authentication.md](./authentication.md) |
| Prisma スキーマ | `prisma/schema.prisma` |
| DB ユーティリティ | `lib/prompts/db.ts` |
