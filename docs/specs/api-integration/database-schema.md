# データベーススキーマ

> **Prismaスキーマ定義と設計方針**
> 
> **最終更新**: 2026-02-22 00:17

---

## 概要

| 項目 | 内容 |
|------|------|
| ORM | Prisma v5.22.0 |
| データベース | PostgreSQL（Neon Serverless） |
| スキーマファイル | `prisma/schema.prisma` |
| 接続設定 | `lib/prisma.ts` |

---

## ER図

```mermaid
erDiagram
    USER ||--o{ MEETING_NOTE : creates
    USER ||--o{ TRANSCRIPT : creates
    USER ||--o{ RESEARCH_CHAT : has
    USER ||--o{ USAGE_LOG : generates
    USER ||--o{ APP_LOG : generates
    USER ||--o{ SYSTEM_PROMPT_VERSION : changes
    RESEARCH_CHAT ||--o{ RESEARCH_MESSAGE : contains
    USER ||--o{ PROGRAM_SETTINGS : has
    USER ||--o{ GROK_TOOL_SETTINGS : has
    SYSTEM_PROMPT ||--o{ SYSTEM_PROMPT_VERSION : has
    
    USER {
        string id PK
        string email
        string name
        string googleId
        string role
        datetime createdAt
    }
    
    MEETING_NOTE {
        string id PK
        string userId FK
        string type
        string rawText
        string formattedText
        string llmProvider
        string status
        datetime createdAt
    }
    
    TRANSCRIPT {
        string id PK
        string userId FK
        string rawText
        string formattedText
        string llmProvider
        datetime createdAt
    }
    
    RESEARCH_CHAT {
        string id PK
        string userId FK
        string agentType
        string title
        string llmProvider
        json results
        datetime createdAt
    }
    
    RESEARCH_MESSAGE {
        string id PK
        string chatId FK
        string role
        string content
        datetime createdAt
    }
    
    USAGE_LOG {
        string id PK
        string userId FK
        string provider
        int inputTokens
        int outputTokens
        float cost
        datetime createdAt
    }
    
    SYSTEM_PROMPT {
        string id PK
        string key
        string name
        string content
        string category
        bool isActive
        int currentVersion
        datetime createdAt
    }
    
    SYSTEM_PROMPT_VERSION {
        string id PK
        string promptId FK
        int version
        string content
        string changedBy
        datetime createdAt
    }
```

---

## 主要テーブル

### User
ユーザーアカウント（NextAuth連携）

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | String | PK, UUID |
| `email` | String | UNIQUE |
| `name` | String? | |
| `googleId` | String? | UNIQUE |
| `role` | String | default: "USER" (ADMIN \| USER) |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | updatedAt |

### MeetingNote
議事録データ

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | String | PK |
| `userId` | String | FK → User |
| `type` | String | `MEETING` \| `INTERVIEW` |
| `rawText` | String | 元の文字起こし |
| `formattedText` | String? | 整形後テキスト |
| `llmProvider` | LLMProvider | 使用プロバイダー |
| `status` | String | `DRAFT` \| `FORMATTING` \| `COMPLETED` |

### ResearchChat / ResearchMessage
リサーチチャット

| テーブル | 説明 |
|---------|------|
| `ResearchChat` | チャットセッション |
| `ResearchMessage` | メッセージ履歴 |

**ResearchChatカラム:**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | String | PK, UUID |
| `userId` | String | FK → User |
| `agentType` | String | `PEOPLE` \| `LOCATION` \| `EVIDENCE` |
| `title` | String? | チャットタイトル（自動生成） |
| `llmProvider` | LLMProvider | 使用プロバイダー |
| `results` | Json? | リサーチ結果 |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

**タイトル自動生成:**
- 新規チャット作成時、最初のユーザーメッセージからGrok(grok-4-0709)で自動生成
- バックグラウンド実行（レスポンスを遅延させない）

### SystemPrompt / SystemPromptVersion
システムプロンプト管理

| テーブル | 説明 |
|---------|------|
| `SystemPrompt` | 現在のプロンプト |
| `SystemPromptVersion` | バージョン履歴 |

**SystemPromptカラム:**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | String | PK |
| `key` | String | UNIQUE, 識別子（MINUTES等） |
| `name` | String | 表示名 |
| `content` | String | プロンプト本文 |
| `category` | String | カテゴリ |
| `isActive` | Boolean | 有効/無効 |
| `currentVersion` | Int | 現在のバージョン番号 |
| `changedBy` | String? | 最終更新者 |
| `changeNote` | String? | 変更理由 |

### UsageLog
LLM使用量ログ

| カラム | 型 | 説明 |
|--------|-----|------|
| `provider` | LLMProvider | 使用プロバイダー |
| `inputTokens` | Int | 入力トークン |
| `outputTokens` | Int | 出力トークン |
| `cost` | Float | 推定コスト（USD） |
| `userId` | String | FK → User |

### AppLog
アプリケーションログ

| カラム | 型 | 説明 |
|--------|-----|------|
| `level` | LogLevel | ERROR / WARN / INFO |
| `category` | LogCategory | AUTH / API / DB等 |
| `message` | String | ログメッセージ |
| `details` | Json? | 詳細情報 |
| `userId` | String? | 関連ユーザー |
| `requestId` | String? | リクエストID |
| `duration` | Int? | 処理時間（ms） |

---

## Enum定義

```prisma
enum LLMProvider {
  GEMINI_25_FLASH_LITE
  GEMINI_30_FLASH
  GROK_4_1_FAST_REASONING
  GROK_4_0709
  GPT_4O_MINI
  GPT_5
  CLAUDE_SONNET_45
  CLAUDE_OPUS_46
  PERPLEXITY_SONAR
  PERPLEXITY_SONAR_PRO
}

enum LogLevel {
  INFO
  WARN
  ERROR
  AUDIT
}

enum LogCategory {
  AUTH
  API
  DB
  SYSTEM
  USER_ACTION
  SECURITY
  PERFORMANCE
}
```

---

## インデックス

| テーブル | インデックス | 用途 |
|---------|-----------|------|
| MeetingNote | `(userId, status, createdAt)` | ステータス別一覧 |
| ResearchChat | `(userId, agentType, createdAt)` | エージェント別一覧 |
| UsageLog | `(userId, provider, createdAt)` | 利用統計 |
| AppLog | `(level, createdAt)` | エラーログ検索 |
| SystemPrompt | `(category, isActive)` | カテゴリ別検索 |
| SystemPromptVersion | `(promptId, version)` | バージョン検索 |

詳細なインデックス一覧: `prisma/schema.prisma` 参照

---

## マイグレーション履歴

| # | マイグレーション | 主な変更 |
|---|----------------|---------|
| 1 | `20260215181608_init` | 初期スキーマ |
| 2 | `20260216045708_add_refresh_token_expires_in` | Account更新 |
| 3 | `20260219105000_add_system_prompts` | SystemPrompt追加 |
| 4 | `20260220000000_update_grok_enum` | Grok Enum更新 |
| 5 | `20260221000000_add_chat_title` | ResearchChatにtitle追加 |
| 6 | `20260221120000_add_system_prompt_versions` | バージョン履歴テーブル追加 |

実行コマンド:
```bash
npx prisma migrate dev    # 開発環境
npx prisma migrate deploy # 本番環境
npx prisma generate       # クライアント生成
npx prisma studio         # GUI管理ツール
```

---

## 関連仕様

| 項目 | 参照先 |
|-----|--------|
| 接続設定 | `lib/prisma.ts` |
| 環境構築 | [guides/setup/database-cache.md](../guides/setup/database-cache.md) |
| パフォーマンス | [performance.md](../operations/performance.md#データベース最適化) |
| プロンプト管理 | [system-prompt-management.md](./system-prompt-management.md) |
