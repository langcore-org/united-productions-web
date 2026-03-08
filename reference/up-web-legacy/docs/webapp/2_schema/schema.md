# T-Agent Database Schema

## 概要

T-Agent用のPostgreSQL（Supabase）データベーススキーマ。セッション管理を含むすべてのデータをPostgreSQLで管理。

## ERダイアグラム

```mermaid
erDiagram
    USERS ||--o{ WORKSPACE_MEMBERS : joins
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : has
    WORKSPACES ||--o{ PROGRAMS : contains
    WORKSPACES ||--o{ DRIVE_FILE_CACHE : caches

    PROGRAMS ||--o{ TEAMS : contains
    TEAMS ||--o{ TEAM_FILE_REFS : references
    TEAMS ||--o{ CHAT_SESSIONS : owns

    CHAT_SESSIONS ||--o{ MESSAGES : contains
    CHAT_SESSIONS ||--o{ SESSION_OUTPUTS : produces

    USERS ||--|| USER_SETTINGS : has

    USERS {
        uuid id PK
        string email UK
        string display_name
        string avatar_url
        boolean is_system_admin
        enum auth_provider
        string auth_provider_id
        timestamp created_at
        timestamp updated_at
    }

    USER_SETTINGS {
        uuid id PK
        uuid user_id FK UK
        string darkmode
        string theme
        boolean email_notifications
        boolean push_notifications
        enum notification_frequency
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACES {
        uuid id PK
        string name
        string slug UK
        string description
        string logo_url
        string website_url
        boolean google_drive_connected
        string google_refresh_token
        timestamp google_token_expires_at
        timestamp created_at
        timestamp updated_at
    }

    WORKSPACE_MEMBERS {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        string email
        uuid invited_by FK
        timestamp invited_at
        enum role
        enum status
        timestamp joined_at
        timestamp created_at
        timestamp updated_at
    }

    PROGRAMS {
        uuid id PK
        uuid workspace_id FK
        string name
        string description
        enum status
        string google_drive_root_id
        string google_drive_root_name
        string google_drive_root_url
        string cover_image_url
        date start_date
        date end_date
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    TEAMS {
        uuid id PK
        uuid program_id FK
        string name
        string description
        enum agent_type
        text system_prompt
        text output_format_template
        string output_directory_id
        string output_directory_name
        string output_directory_url
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    TEAM_FILE_REFS {
        uuid id PK
        uuid team_id FK
        enum ref_type
        string drive_id
        string drive_name
        string drive_path
        string drive_url
        string mime_type
        boolean include_subfolders
        integer display_order
        uuid created_by FK
        timestamp created_at
    }

    CHAT_SESSIONS {
        uuid id PK
        uuid team_id FK
        string title
        enum status
        string claude_session_id
        integer message_count
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    MESSAGES {
        uuid id PK
        uuid session_id FK
        enum role
        text content
        jsonb file_attachments
        jsonb tool_calls
        string model
        jsonb token_usage
        timestamp created_at
    }

    SESSION_OUTPUTS {
        uuid id PK
        uuid session_id FK
        uuid message_id FK
        string title
        text content
        enum status
        string exported_drive_id
        string exported_drive_url
        timestamp exported_at
        string output_type
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    DRIVE_FILE_CACHE {
        uuid id PK
        uuid workspace_id FK
        string drive_id
        string parent_id
        string name
        string mime_type
        boolean is_folder
        bigint size_bytes
        string web_view_link
        string icon_link
        string content_hash
        timestamp content_cached_at
        timestamp drive_modified_at
        timestamp synced_at
    }
```

## テーブル一覧

| テーブル | 説明 | 主な用途 |
|----------|------|----------|
| `users` | ユーザー情報 | 認証ユーザーの基本情報（システム管理者フラグ、認証プロバイダー） |
| `user_settings` | ユーザー設定 | UI設定、通知設定 |
| `workspaces` | ワークスペース | 制作会社・組織単位（website_url追加） |
| `workspace_members` | メンバーシップ | ユーザーとワークスペースの関連（招待機能対応） |
| `programs` | 番組 | TV番組プロジェクト |
| `teams` | チーム | 番組内の作業チーム |
| `team_file_refs` | ファイル参照 | チームが参照可能なDriveファイル |
| `chat_sessions` | チャットセッション | AIとの会話セッション |
| `messages` | メッセージ | 個別のチャットメッセージ |
| `session_outputs` | 成果物 | セッションから生成された成果物 |
| `drive_file_cache` | Driveキャッシュ | @メンション高速化用キャッシュ |

> **Note**: エージェントプリセットはDBではなくコードで管理

## 階層構造

```
User
├── User Settings (ユーザー設定)
└── Workspace Memberships

Workspace (ワークスペース/制作会社)
├── Members (メンバー/招待)
├── Drive File Cache (ファイルキャッシュ)
└── Programs (番組)
    ├── Google Drive Root
    └── Teams (チーム)
        ├── File References (参照ファイル)
        ├── Output Directory (出力先)
        └── Chat Sessions (セッション)
            ├── Messages (メッセージ)
            └── Session Outputs (成果物)
```

## ENUM定義

### auth_provider_enum
| 値 | 説明 |
|-----|------|
| `email` | メール認証 |
| `google` | Google OAuth |
| `azure` | Azure AD |
| `github` | GitHub OAuth |

### notification_frequency_enum
| 値 | 説明 |
|-----|------|
| `realtime` | リアルタイム |
| `hourly` | 1時間ごと |
| `daily` | 1日ごと |
| `never` | 通知なし |

### workspace_role_enum
| 値 | 説明 |
|-----|------|
| `owner` | オーナー（全権限） |
| `admin` | 管理者 |
| `member` | 一般メンバー |

### agent_type_enum
| 値 | 説明 |
|-----|------|
| `research` | リサーチエージェント |
| `idea_finder` | ネタ探しエージェント |
| `planning` | 企画作家エージェント |
| `structure` | 構成作家エージェント |
| `custom` | カスタムエージェント |

### message_role_enum
| 値 | 説明 |
|-----|------|
| `user` | ユーザーメッセージ |
| `assistant` | AIアシスタントメッセージ |
| `system` | システムメッセージ |

### session_status_enum
| 値 | 説明 |
|-----|------|
| `active` | アクティブ |
| `archived` | アーカイブ済み |
| `deleted` | 削除済み |

## JSONBフィールド構造

### messages.file_attachments
```json
[
  {
    "drive_id": "1abc...",
    "name": "企画概要.pdf",
    "path": "/企画資料/企画概要.pdf",
    "content_preview": "最初の500文字...",
    "mime_type": "application/pdf"
  }
]
```

### messages.tool_calls
```json
[
  {
    "tool_name": "web_search",
    "input": { "query": "最新トレンド 2025" },
    "output": { "results": [...] }
  }
]
```

### messages.token_usage
```json
{
  "input_tokens": 1500,
  "output_tokens": 800
}
```

## デフォルトエージェントプリセット

スキーマ作成時に以下の4つのシステムプリセットが自動挿入されます：

1. **リサーチエージェント** (`research`)
   - 情報収集・調査
   - 調査レポート出力

2. **ネタ探しエージェント** (`idea_finder`)
   - トレンド・話題発掘
   - ネタリスト出力

3. **企画作家エージェント** (`planning`)
   - 企画立案・構想
   - 企画書出力

4. **構成作家エージェント** (`structure`)
   - 台本・構成作成
   - 構成台本出力

## マイグレーション

```bash
# Supabaseにスキーマを適用
cd supabase
supabase db push

# または新しいマイグレーションとして追加
supabase migration new t_agent_schema
# schema.sqlの内容をマイグレーションファイルにコピー
supabase db push
```

## 既存スキーマとの関係

このスキーマは既存の`instances`テーブルを`workspaces`として再定義し、T-Agent専用のテーブルを追加しています。既存のスキーマと共存させる場合は、テーブル名のプレフィックス（例: `tagent_`）を検討してください。
