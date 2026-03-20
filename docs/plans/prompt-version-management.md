# プロンプトバージョン管理 実装計画

> **作成日**: 2026-02-24 18:00
> **更新日**: 2026-03-20
> **ステータス**: ✅ 実装完了（Supabase対応済み）
> **目的**: プロンプトの変更履歴を完全に管理し、ロールバック可能にする

---

## 概要

現在のプロンプト管理を改善し、すべての変更をバージョンとして保存する。

### 現状の問題

- プロンプト変更時に履歴が残らない
- 過去のバージョンに戻せない
- 誰がいつ変更したか不明

### 新設計のメリット

| メリット | 説明 |
|---------|------|
| 完全な履歴管理 | すべての変更がバージョンとして保存される |
| ロールバック容易 | 過去のバージョンに簡単に戻せる |
| 監査可能 | 変更者・変更日時・変更理由を追跡可能 |
| A/Bテスト可能 | バージョンを切り替えて効果を比較 |

---

## データベース設計

### テーブル構成（2テーブル）

> **実装状況**: Supabase PostgreSQLに実装済み。RLSポリシー適用済み。

```prisma
// schema.prisma

model SystemPrompt {
  id          String    @id @default(cuid())
  key         String    @unique           // GENERAL_CHAT, MINUTES, etc.
  name        String                       // 表示名
  description String?                      // 説明
  category    String                       // general, research, etc.
  isActive    Boolean   @default(true)    // 有効/無効
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  versions    SystemPromptVersion[]
  
  @@index([key])
  @@index([category])
  @@index([isActive])
}

model SystemPromptVersion {
  id          String   @id @default(cuid())
  promptId    String
  version     Int                          // 1, 2, 3, ...
  content     String   @db.Text            // プロンプト本文
  changedBy   String?                      // ユーザーID（変更者）
  changeNote  String?                      // 変更理由・メモ
  createdAt   DateTime @default(now())
  
  prompt      SystemPrompt @relation(fields: [promptId], references: [id])
  
  @@unique([promptId, version])            // 同じプロンプトでバージョン重複不可
  @@index([promptId, version])             // 最新バージョン取得用
}
```

### リレーション図

```
┌─────────────────┐         ┌─────────────────────────┐
│  SystemPrompt   │         │  SystemPromptVersion    │
├─────────────────┤         ├─────────────────────────┤
│ id (PK)         │◄───────│ promptId (FK)           │
│ key (UNIQUE)    │   1:N   │ version (UNIQUE複合)    │
│ name            │         │ content                 │
│ description     │         │ changedBy               │
│ category        │         │ changeNote              │
│ isActive        │         │ createdAt               │
│ createdAt       │         └─────────────────────────┘
│ updatedAt       │
└─────────────────┘
```

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/prompts` | プロンプト一覧（最新バージョン） |
| GET | `/api/prompts/[key]` | 特定プロンプトの最新バージョン |
| GET | `/api/prompts/[key]/versions` | バージョン履歴一覧 |
| GET | `/api/prompts/[key]/versions/[version]` | 特定バージョンの取得 |
| POST | `/api/prompts/[key]/versions` | 新しいバージョンを作成 |
| POST | `/api/prompts/[key]/rollback` | 過去のバージョンに戻す |

### リクエスト/レスポンス例

#### 新しいバージョンを作成

```typescript
// POST /api/prompts/GENERAL_CHAT/versions
// Request
{
  "content": "## エージェント的振る舞いの原則\n...",
  "changeNote": "思考プロセス出力を削除"
}

// Response
{
  "success": true,
  "version": {
    "id": "xxx",
    "version": 3,
    "content": "## エージェント的振る舞いの原則\n...",
    "changedBy": "user_xxx",
    "changeNote": "思考プロセス出力を削除",
    "createdAt": "2026-02-24T18:00:00Z"
  }
}
```

#### バージョン履歴を取得

```typescript
// GET /api/prompts/GENERAL_CHAT/versions

// Response
{
  "prompt": {
    "key": "GENERAL_CHAT",
    "name": "一般チャット",
    "currentVersion": 3
  },
  "versions": [
    {
      "version": 3,
      "changeNote": "思考プロセス出力を削除",
      "changedBy": "user_xxx",
      "createdAt": "2026-02-24T18:00:00Z"
    },
    {
      "version": 2,
      "changeNote": "ツール使用の説明を追加",
      "changedBy": "user_yyy",
      "createdAt": "2026-02-20T20:04:34Z"
    },
    {
      "version": 1,
      "changeNote": "初期バージョン",
      "changedBy": null,
      "createdAt": "2026-02-19T23:55:04Z"
    }
  ]
}
```

#### ロールバック

```typescript
// POST /api/prompts/GENERAL_CHAT/rollback
// Request
{
  "version": 2  // バージョン2に戻す
}

// Response
{
  "success": true,
  "newVersion": {
    "version": 4,  // 新しいバージョンとして保存
    "content": "（バージョン2の内容）",
    "changeNote": "ロールバック: バージョン2に戻す",
    "createdAt": "2026-02-24T18:30:00Z"
  }
}
```

---

## 実装詳細

### ライブラリ関数

```typescript
// lib/prompts/db/versions.ts

/**
 * 最新のプロンプトを取得
 */
export async function getLatestPrompt(key: string): Promise<{
  content: string;
  version: number;
} | null>;

/**
 * 新しいバージョンを作成
 */
export async function createPromptVersion(
  key: string,
  data: {
    content: string;
    changeNote?: string;
    changedBy?: string;
  }
): Promise<SystemPromptVersion>;

/**
 * バージョン履歴を取得
 */
export async function getPromptVersions(
  key: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<SystemPromptVersion[]>;

/**
 * 特定のバージョンを取得
 */
export async function getPromptVersion(
  key: string,
  version: number
): Promise<SystemPromptVersion | null>;

/**
 * ロールバック（過去のバージョンを新しいバージョンとして複製）
 */
export async function rollbackPrompt(
  key: string,
  targetVersion: number,
  options?: {
    changeNote?: string;
    changedBy?: string;
  }
): Promise<SystemPromptVersion>;
```

### 既存関数の変更

```typescript
// lib/prompts/db/crud.ts

// 変更前
export async function getPromptFromDB(key: string): Promise<string | null> {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
  });
  return prompt?.content || null;
}

// 変更後
export async function getPromptFromDB(key: string): Promise<string | null> {
  const latest = await prisma.systemPromptVersion.findFirst({
    where: { prompt: { key } },
    orderBy: { version: 'desc' },
  });
  return latest?.content || null;
}
```

---

## UI設計

### プロンプト管理画面

```
┌─────────────────────────────────────────────┐
│  プロンプト管理                              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🔍 検索...                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  カテゴリ: [すべて▼] [一般▼] [リサーチ▼]   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📄 GENERAL_CHAT                     │   │
│  │    一般チャット                     │   │
│  │    バージョン: 3 | 最終更新: 2/24   │   │
│  │    [編集] [履歴] [プレビュー]       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📄 MINUTES                          │   │
│  │    議事録作成                       │   │
│  │    バージョン: 10 | 最終更新: 2/20  │   │
│  │    [編集] [履歴] [プレビュー]       │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### バージョン履歴画面

```
┌─────────────────────────────────────────────┐
│  GENERAL_CHAT - バージョン履歴              │
├─────────────────────────────────────────────┤
│                                             │
│  現在のバージョン: 3                        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ● バージョン 3 (現在)               │   │
│  │   変更: 思考プロセス出力を削除      │   │
│  │   変更者: user_xxx | 2026/02/24     │   │
│  │   [表示] [このバージョンに戻す]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ バージョン 2                      │   │
│  │   変更: ツール使用の説明を追加      │   │
│  │   変更者: user_yyy | 2026/02/20     │   │
│  │   [表示] [このバージョンに戻す]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ○ バージョン 1                      │   │
│  │   変更: 初期バージョン              │   │
│  │   変更者: system | 2026/02/19       │   │
│  │   [表示]                            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### 編集画面

```
┌─────────────────────────────────────────────┐
│  GENERAL_CHAT - 編集                        │
├─────────────────────────────────────────────┤
│                                             │
│  現在のバージョン: 3                        │
│                                             │
│  変更理由（必須）:                          │
│  ┌─────────────────────────────────────┐   │
│  │ 思考プロセス出力を削除              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  プロンプト内容:                            │
│  ┌─────────────────────────────────────┐   │
│  │ ## エージェント的振る舞いの原則     │   │
│  │                                     │   │
│  │ あなたは自律的に情報を収集...       │   │
│  │ ...                                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [プレビュー] [キャンセル] [バージョン4として保存] │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 実装タスク

### Phase 1: データベース変更（1時間）

- [ ] `SystemPromptVersion`テーブルを作成するマイグレーション
- [ ] 既存データを移行（`systemPrompt.content` → `systemPromptVersion`）
- [ ] `systemPrompt.content`カラムを削除（オプション）

### Phase 2: バックエンド実装（3-4時間）

- [ ] `lib/prompts/db/versions.ts` の作成
  - `getLatestPrompt`
  - `createPromptVersion`
  - `getPromptVersions`
  - `rollbackPrompt`
- [ ] `lib/prompts/db/crud.ts` の修正
  - `getPromptFromDB` を新設計に対応
- [ ] APIエンドポイントの作成
  - `GET /api/prompts/[key]/versions`
  - `POST /api/prompts/[key]/versions`
  - `POST /api/prompts/[key]/rollback`

### Phase 3: フロントエンド実装（4-6時間）

- [ ] プロンプト一覧画面
- [ ] バージョン履歴画面
- [ ] 編集画面（変更理由入力必須）
- [ ] バージョン比較機能（diff表示）

### Phase 4: テスト・調整（2-3時間）

- [ ] バージョン作成のテスト
- [ ] ロールバックのテスト
- [ ] 既存機能の回帰テスト

**合計工数: 10-14時間（約2日）**

---

## 運用手順

### プロンプト変更時

1. 管理画面でプロンプトを選択
2. 「編集」ボタンをクリック
3. 変更理由を入力（必須）
4. プロンプト内容を編集
5. 「保存」ボタンをクリック
6. 新しいバージョンとして保存される

### ロールバック時

1. 管理画面でプロンプトを選択
2. 「履歴」ボタンをクリック
3. 戻したいバージョンを選択
4. 「このバージョンに戻す」ボタンをクリック
5. 確認ダイアログで「OK」
6. 新しいバージョンとして複製される（上書きではない）

### 監査時

1. 管理画面でプロンプトを選択
2. 「履歴」ボタンをクリック
3. 各バージョンの変更者・変更日時・変更理由を確認

---

## 今回の変更（思考プロセス削除）の適用方法

```typescript
// スクリプトで適用
await createPromptVersion('GENERAL_CHAT', {
  content: NEW_PROMPT_WITHOUT_THINKING,
  changeNote: '思考プロセス出力を削除',
  changedBy: 'system',  // または管理者ユーザーID
});
```

---

## 参考リンク

- [Prisma Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Migration](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## 履歴

| 日付 | 内容 |
|------|------|
| 2026-02-24 18:00 | 初版作成 |
