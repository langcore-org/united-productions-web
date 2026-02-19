# データベース設計ドキュメント

## 概要

| 項目 | 内容 |
|------|------|
| ORM | Prisma v5.22.0 |
| データベース | PostgreSQL（Neon Serverless） |
| スキーマファイル | `prisma/schema.prisma` |
| マイグレーション | `prisma/migrations/` |
| 接続設定 | `lib/prisma.ts` |

---

## テーブル一覧

| テーブル名 | 目的 | 主キー型 |
|-----------|------|---------|
| `User` | ユーザーアカウント（NextAuth連携） | UUID |
| `Account` | OAuth認証プロバイダー情報 | cuid |
| `Session` | セッション管理 | cuid |
| `VerificationToken` | メール確認トークン | 複合主キー |
| `MeetingNote` | 議事録データ（PJ-A） | UUID |
| `Transcript` | 文字起こし・NA原稿（PJ-B） | UUID |
| `ResearchChat` | リサーチチャットセッション（PJ-C） | UUID |
| `ResearchMessage` | リサーチチャットメッセージ | UUID |
| `LocationSchedule` | ロケスケジュール（廃止予定） | UUID |
| `UsageLog` | LLM API使用量ログ | UUID |
| `ProgramSettings` | ユーザー番組設定 | cuid |
| `SystemPrompt` | システムプロンプト管理 | cuid |
| `SystemSettings` | グローバル管理設定（KVストア） | String（key） |

---

## Enum 定義

### `LLMProvider`

```prisma
enum LLMProvider {
  GEMINI_25_FLASH_LITE      // デフォルト
  GEMINI_30_FLASH
  GROK_4_1_FAST_REASONING   // 推論特化
  GROK_4_0709               // 標準版
  GPT_4O_MINI
  GPT_5
  CLAUDE_SONNET_45
  CLAUDE_OPUS_46
  PERPLEXITY_SONAR
  PERPLEXITY_SONAR_PRO
}
```

> **注意:** マイグレーション `20260220000000` で `GROK_41_FAST` → `GROK_4_1_FAST_REASONING`、`GROK_4` → `GROK_4_0709` にリネームされた。

---

## テーブル詳細

### User

ユーザーアカウント情報。NextAuth.js の Prisma Adapter が使用。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `name` | String? | | 表示名 |
| `email` | String? | UNIQUE, INDEX | メールアドレス |
| `emailVerified` | DateTime? | | メール確認日時 |
| `image` | String? | | プロフィール画像URL |
| `googleId` | String? | UNIQUE, INDEX | Google アカウントID |
| `createdAt` | DateTime | default: now() | 作成日時 |
| `updatedAt` | DateTime | @updatedAt | 更新日時 |

> ⚠️ `email` と `googleId` は `@unique` と `@@index` が重複定義されている（冗長）。

---

### Account

NextAuth.js が管理するOAuthアカウント情報。

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | String | PK, cuid |
| `userId` | String | FK → User.id (CASCADE) |
| `provider` | String | |
| `providerAccountId` | String | |
| `refresh_token_expires_in` | Int? | マイグレーション2で追加 |
| 他 OAuth フィールド | 各種 | |

インデックス: `(provider, providerAccountId)` UNIQUE

---

### MeetingNote

議事録データ（PJ-A）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `userId` | String | FK → User.id (CASCADE) | |
| `title` | String | | タイトル |
| `type` | String | | `MEETING` \| `INTERVIEW` ⚠️ Enum非使用 |
| `rawText` | String | TEXT | 元の文字起こし |
| `formattedText` | String? | TEXT | 整形後テキスト |
| `llmProvider` | LLMProvider | default: GEMINI_25_FLASH_LITE | |
| `status` | String | | `DRAFT` \| `FORMATTING` \| `COMPLETED` ⚠️ Enum非使用 |
| `createdAt` | DateTime | default: now() | |
| `updatedAt` | DateTime | @updatedAt | |

インデックス:
- `(userId, status, createdAt)` — ステータス別一覧取得
- `(userId, createdAt)` — タイムライン取得
- `status` — ステータス絞り込み

---

### Transcript

文字起こし・NA原稿データ（PJ-B）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `userId` | String | FK → User.id (CASCADE) | |
| `title` | String | | タイトル |
| `type` | String | | `TRANSCRIPT` \| `NA` |
| `rawText` | String | TEXT | 入力テキスト |
| `formattedText` | String? | TEXT | 整形後テキスト |
| `llmProvider` | LLMProvider | default: GEMINI_25_FLASH_LITE | |
| `createdAt` | DateTime | default: now() | |
| `updatedAt` | DateTime | @updatedAt | |

インデックス: `(userId, createdAt)`

---

### ResearchChat

リサーチチャットセッション（PJ-C）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `userId` | String | FK → User.id (CASCADE) | |
| `title` | String? | | タイトル |
| `agentType` | String | | `PEOPLE` \| `LOCATION` \| `EVIDENCE` ⚠️ Enum非使用 |
| `llmProvider` | LLMProvider | default: GROK_4_1_FAST_REASONING | |
| `results` | Json? | JSONB | リサーチ結果 |
| `createdAt` | DateTime | default: now() | |
| `updatedAt` | DateTime | @updatedAt | |

インデックス:
- `(userId, agentType, createdAt)` — エージェント別タイムライン
- `(userId, createdAt)` — タイムライン取得
- `agentType` — エージェント絞り込み
- `llmProvider` — プロバイダー別検索

---

### ResearchMessage

リサーチチャットのメッセージログ。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `chatId` | String | FK → ResearchChat.id (CASCADE) | |
| `role` | String | | `USER` \| `ASSISTANT` \| `SYSTEM` ⚠️ Enum非使用 |
| `content` | String | TEXT | メッセージ本文 |
| `thinking` | String? | TEXT | 思考過程ログ |
| `createdAt` | DateTime | default: now() | |

インデックス:
- `(chatId, createdAt)` — 会話タイムライン
- `role` — ロール別検索

---

### UsageLog

LLM API の使用量・コスト追跡。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, UUID | |
| `userId` | String | FK → User.id (CASCADE) | |
| `provider` | LLMProvider | | 使用プロバイダー |
| `feature` | String | | 使用機能名 |
| `inputTokens` | Int | | 入力トークン数 |
| `outputTokens` | Int | | 出力トークン数 |
| `cost` | Float | | 推定コスト（USD） |
| `metadata` | Json? | JSONB | 追加情報 |
| `createdAt` | DateTime | default: now() | |

インデックス:
- `(userId, provider, createdAt)` — ユーザー×プロバイダー別統計
- `(userId, createdAt)` — ユーザー別タイムライン
- `(provider, createdAt)` — プロバイダー別統計
- `(createdAt, cost)` — コスト分析

---

### ProgramSettings

ユーザーごとの番組設定（1ユーザー1レコード）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, cuid | |
| `userId` | String | UNIQUE, FK → User.id (CASCADE) | |
| `programInfo` | String? | TEXT | 番組情報 |
| `pastProposals` | String? | TEXT | 過去企画 |
| `updatedAt` | DateTime | @updatedAt | |

---

### SystemPrompt

各機能のシステムプロンプトを管理する（管理者が編集可能）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | String | PK, cuid | |
| `key` | String | UNIQUE | 識別子（例: `MINUTES`） |
| `category` | String | INDEX | `general` / `minutes` / `transcript` / `research` / `document` |
| `name` | String | | 表示名 |
| `content` | String | TEXT | プロンプト本文 |
| `isActive` | Boolean | default: true, INDEX | 有効フラグ |
| `createdAt` | DateTime | default: now() | |
| `updatedAt` | DateTime | @updatedAt | |

初期データ: マイグレーション `20260219105000` の `seed.sql` で16件投入。

---

### SystemSettings

グローバル設定のKVストア（管理者向け）。

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `key` | String | PK | 設定キー（例: `llm.defaultProvider`） |
| `value` | String | | 設定値 |
| `updatedAt` | DateTime | default: now() | ⚠️ @updatedAt 未設定（自動更新されない） |

マイグレーション `20260220000000` で追加。

---

### LocationSchedule（廃止予定）

ロケスケジュール管理。コード上では機能削除済みだが、テーブルは残存。

> ⚠️ 次のマイグレーションでテーブル削除予定。

---

## マイグレーション履歴

| # | マイグレーション名 | 適用日時 | 主な変更 |
|---|-------------------|---------|---------|
| 1 | `20260215181608_init` | 2026-02-16 | 初期スキーマ作成（全テーブル・インデックス） |
| 2 | `20260216045708_add_refresh_token_expires_in` | 2026-02-16 | `Account.refresh_token_expires_in` カラム追加 |
| 3 | `20260219105000_add_system_prompts` | 2026-02-19 | `SystemPrompt` テーブル作成 + 初期データ投入 |
| 4 | `20260220000000_update_grok_enum_add_system_settings` | 2026-02-20 | Grok Enum リネーム + `SystemSettings` テーブル追加 |

全マイグレーション適用済み。

---

## カスケード削除の連鎖

User を削除すると、関連するすべてのデータが自動削除される。

```
User 削除
├── Account（NextAuth用）
├── Session
├── MeetingNote
├── Transcript
├── ResearchChat
│   └── ResearchMessage（ResearchChat 経由で連鎖）
├── LocationSchedule
├── UsageLog
└── ProgramSettings
```

> ⚠️ 誤削除時の復旧手段がない。重要データについてはバックアップ運用を徹底すること。

---

## インデックス戦略

### 設計方針

- ユーザーデータは `(userId, ...)` の複合インデックスで先頭列を統一
- 時系列取得には `createdAt` を末尾に付与
- 絞り込み検索が多いカラムには個別インデックスを追加

### インデックス一覧

| テーブル | インデックス | 種別 | 用途 |
|---------|-----------|------|------|
| User | `email` | UNIQUE | ログイン検索 |
| User | `googleId` | UNIQUE | OAuth連携 |
| Account | `(provider, providerAccountId)` | UNIQUE | OAuth重複排除 |
| Session | `sessionToken` | UNIQUE | セッション取得 |
| MeetingNote | `(userId, status, createdAt)` | 複合 | ステータス別一覧 |
| MeetingNote | `(userId, createdAt)` | 複合 | タイムライン取得 |
| MeetingNote | `status` | 単一 | ステータス絞り込み |
| ResearchChat | `(userId, agentType, createdAt)` | 複合 | エージェント別一覧 |
| ResearchChat | `(userId, createdAt)` | 複合 | タイムライン取得 |
| ResearchChat | `agentType` | 単一 | エージェント絞り込み |
| ResearchChat | `llmProvider` | 単一 | プロバイダー別検索 |
| ResearchMessage | `(chatId, createdAt)` | 複合 | 会話ログ取得 |
| ResearchMessage | `role` | 単一 | ロール絞り込み |
| UsageLog | `(userId, provider, createdAt)` | 複合 | 利用統計 |
| UsageLog | `(userId, createdAt)` | 複合 | ユーザー別タイムライン |
| UsageLog | `(provider, createdAt)` | 複合 | プロバイダー別統計 |
| UsageLog | `(createdAt, cost)` | 複合 | コスト分析 |
| SystemPrompt | `category` | 単一 | カテゴリ絞り込み |
| SystemPrompt | `isActive` | 単一 | 有効フラグ絞り込み |

---

## 既知の問題と改善 TODO

### 🔴 優先度：高

1. **String型で列挙値を管理している**
   `MeetingNote.type`、`MeetingNote.status`、`ResearchChat.agentType`、`ResearchMessage.role` がDBレベルの型制約なし。
   → Enumに昇格させるマイグレーションを作成する。

2. **`LocationSchedule` テーブルが残存**
   コード上では機能削除済みだが、テーブルとseed.sqlにロケスケ向けプロンプトが残っている。
   → テーブル削除マイグレーションを作成する。

### 🟡 優先度：中

3. **`SystemSettings.updatedAt` が自動更新されない**
   Prismaの `@updatedAt` が未設定のため、値を更新しても `updatedAt` が変わらない。
   → `@updatedAt` を追加するマイグレーションを作成する。

4. **UUID と cuid の混用**
   `User` は UUID、`Account`/`Session`/`ProgramSettings`/`SystemPrompt` は cuid。設計の一貫性が低い。
   → 新規テーブルは UUID に統一する（既存は移行コスト大のため随時対応）。

5. **`User` テーブルの冗長インデックス**
   `email`、`googleId` に `@unique` と `@@index` が重複定義されている。
   → `@@index` を削除するマイグレーションを追加する。

6. **CASCADE DELETE のみでソフトデリートなし**
   ユーザー削除時に全データが完全削除される。復旧手段がない。
   → 必要に応じて `deleted_at` カラムによるソフトデリートを検討する。

### 🔵 優先度：低（将来対応）

7. **JSONB フィールドのスキーマ未定義**
   `ResearchChat.results`、`UsageLog.metadata` の型をZodで定義・保証する。

8. **トランザクション未使用**
   複数テーブルを操作する処理で `prisma.$transaction()` を使用していない箇所がある。

---

## 接続設定

```typescript
// lib/prisma.ts
// 開発環境: query/error/warn ログ有効
// 本番環境: error ログのみ
// グローバルキャッシュ: ホットリロード対策済み
```

`.env.local` の設定:

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

> Neon Free Tier では接続プールの設定として `?connection_limit=5&pool_timeout=10` の追加を推奨。
