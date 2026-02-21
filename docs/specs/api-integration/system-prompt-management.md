# システムプロンプト管理 実装プラン

> **DB管理・バージョン履歴・管理画面の設計方針**
>
> **最終更新**: 2026-02-22 00:17

---

## 現状の整理

### 現在の構成

```
lib/prompts/
├── index.ts           # 統合エクスポート（DBファーストのフォールバック構成）
├── db.ts              # DB取得ユーティリティ + DEFAULT_PROMPTS（シードデータ）
└── (廃止予定)         # 個別プロンプトファイルは段階的に廃止
```

`SystemPrompt` テーブルはすでに存在し、DB管理の基盤はある。
`SystemPromptVersion` テーブルも追加済みで、**バージョン履歴機能は実装済み**。

### 実装済み機能

| 機能 | 状態 |
|------|------|
| SystemPromptテーブル | ✅ 実装済み |
| SystemPromptVersionテーブル | ✅ 実装済み |
| DB取得ユーティリティ | ✅ 実装済み |
| シードデータ | ✅ 実装済み |
| 管理API | 📝 実装中 |
| 管理UI | 📝 実装中 |

---

## データベース設計

### テーブル: `SystemPrompt`

```prisma
model SystemPrompt {
  id             String   @id @default(cuid())
  key            String   @unique
  name           String
  description    String?
  content        String   @db.Text
  category       String
  isActive       Boolean  @default(true)
  currentVersion Int      @default(1)
  changedBy      String?
  changeNote     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  versions       SystemPromptVersion[]

  @@index([category])
  @@index([isActive])
}
```

### テーブル: `SystemPromptVersion`

```prisma
model SystemPromptVersion {
  id          String       @id @default(cuid())
  promptId    String
  prompt      SystemPrompt @relation(fields: [promptId], references: [id], onDelete: Cascade)
  version     Int
  content     String       @db.Text
  changedBy   String?
  changeNote  String?
  createdAt   DateTime     @default(now())

  @@index([promptId, version])
  @@index([promptId, createdAt])
}
```

### ER図

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

---

## API 設計

すべて `/api/admin/prompts/` 配下。管理者権限（`ADMIN` ロール）のみアクセス可。

### エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/admin/prompts` | プロンプト一覧（カテゴリフィルタ対応） |
| `GET` | `/api/admin/prompts/[key]` | プロンプト詳細（現在のバージョン） |
| `PUT` | `/api/admin/prompts/[key]` | プロンプト更新（バージョン自動採番） |
| `GET` | `/api/admin/prompts/[key]/history` | バージョン履歴一覧 |
| `GET` | `/api/admin/prompts/[key]/history/[version]` | 特定バージョンの内容取得 |
| `POST` | `/api/admin/prompts/[key]/restore` | 指定バージョンに復元 |

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
  "updatedAt": "2026-02-22T00:00:00Z"
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
{ 
  "version": 1, 
  "changeNote": "v1に戻す（v2,3の変更が本番に影響したため）" 
}

// Response
{ 
  "key": "MINUTES", 
  "version": 4, 
  "restoredFrom": 1 
}
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

---

## キャッシュ戦略

現行の「リクエストごとにDB取得」から、必要に応じて以下を検討。

| 戦略 | 推奨タイミング |
|------|---------------|
| キャッシュなし（現行） | 開発初期・プロンプト変更頻度が高い時期 |
| Next.js `unstable_cache` | プロンプト変更が月数回程度になった段階 |
| Redis キャッシュ | 大量リクエスト時のみ（現時点では不要） |

更新時のキャッシュ無効化:
- `PUT /api/admin/prompts/[key]` および `POST .../restore` のレスポンス前に該当キャッシュをパージ

---

## 権限設計

| 操作 | 必要権限 |
|------|---------|
| プロンプト参照（一覧・詳細） | 管理者のみ |
| プロンプト編集・保存 | 管理者のみ |
| 履歴参照 | 管理者のみ |
| バージョン復元 | 管理者のみ |

**管理者の定義**: `User` テーブルの `role` カラムが `ADMIN` のユーザー

---

## 実装フェーズ

### Phase 1: DB 拡張 ✅ 完了

- [x] `SystemPromptVersion` テーブルの追加マイグレーション
- [x] `SystemPrompt` への `currentVersion`, `changedBy`, `changeNote` 追加
- [x] 既存プロンプトへのバージョン1レコード自動作成
- [x] `lib/prompts/db.ts` の更新処理にバージョン記録ロジック追加

### Phase 2: 管理 API 📝 実装中

- [ ] `/api/admin/prompts/` 配下のエンドポイント実装
- [ ] 管理者権限ガード
- [ ] 更新・復元 API のバージョニングロジック実装

### Phase 3: 管理 UI 📝 実装中

- [ ] `/admin/prompts` 一覧ページ
- [ ] `/admin/prompts/[key]` 編集ページ
- [ ] `/admin/prompts/[key]/history` 履歴ページ
- [ ] 復元確認モーダル

### Phase 4: コードプロンプトの廃止（将来）

- [ ] DB シードが正常に動作していることを確認
- [ ] ランタイムフォールバックコードを「DB 取得失敗時はエラーを返す」に変更
- [ ] `lib/prompts/` 内の個別ファイルを削除

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
| 管理画面 | `app/admin/prompts/` |
