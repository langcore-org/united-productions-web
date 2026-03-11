# Supabase 全面移行計画書（詳細版）

> **作成日**: 2026-03-08  
> **更新日**: 2026-03-08（実装進捗を追記）
> **移行対象**: Prisma + Neon + NextAuth.js → Supabase（Auth + Database）  
> **前提条件**: Supabaseプロジェクトは既に作成済み

---

## 目次

1. [移行概要](#1-移行概要)
2. [移行ステップ詳細](#2-移行ステップ詳細)
3. [ファイル別移行マッピング](#3-ファイル別移行マッピング)
4. [トラブルシューティング](#4-トラブルシューティング)
5. [チェックリスト](#5-チェックリスト)
6. [参考リンク](#6-参考リンク)
7. [更新履歴](#更新履歴)

---

## 1. 移行概要

### 1.1 重要: Google Drive連携はスコープ外

> **理由**:
> - 現時点ではUI上でGoogle Drive機能は未実装
> - Google Drive連携はPhase 2（将来対応）として別途計画
> - Supabase Auth移行時に`provider_token`取得方法を設計メモとして残す

### 1.2 移行前後のアーキテクチャ比較

```
【移行前（現在）】
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ NextAuth.js  │  │   Prisma     │  │ Google OAuth API │  │
│  │   (Auth)     │  │    (ORM)     │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  NextAuth DB    │  │  Neon Postgres  │
│  (Sessions等)   │  │  (主要データ)   │
└─────────────────┘  └─────────────────┘

【移行後（目標）】
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │Supabase Auth │  │Supabase Client│                        │
│  │   (Auth)     │  │   (DB操作)    │                        │
│  └──────┬───────┘  └──────┬───────┘                        │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          └────────┬────────┘
                   ▼
        ┌─────────────────────────────────────┐
        │        Supabase Platform            │
        │  ┌──────────┬──────────────────┐   │
        │  │   Auth   │   PostgreSQL     │   │
        │  │          │   (RLS有効)      │   │
        │  └──────────┴──────────────────┘   │
        └─────────────────────────────────────┘

【将来対応】Google Drive連携
- 現時点ではUI上未実装のため、Supabase移行完了後に別途対応
- Google OAuth Provider設定は行うが、Drive API連携はPhase 2で実装
```

### 1.3 工数見積もり（Google Drive連携除外）

| ステップ | 内容 | 工数 | 難易度 |
|---------|------|------|--------|
| 1 | データベーススキーマ移行 | 4-8時間 | 🟡 中 |
| 2 | **既存データ移行（Neon→Supabase）** | **4-8時間** | 🟡 **中** |
| 3 | 認証システム移行 | 12-16時間 | 🔴 高 |
| 4 | DB操作コード移行 | 40-60時間 | 🔴 高 |
| 5 | 環境変数・設定更新 | 2-4時間 | 🟢 低 |
| 6 | テスト・検証 | 12-16時間 | 🟡 中 |
| **合計** | | **74-112時間（約1.5-2.5週間）** | |

> **備考**: 
> - Google Drive連携はPhase 2として将来対応（追加工数: 8-12時間）
> - **データ移行は本番環境で一度のみ実施**（検証環境でのテスト含む）

---

## 2. 移行ステップ詳細

### ステップ1: データベーススキーマ移行（4-8時間）

#### 1.1 現在のスキーマ確認

**対象ファイル**: `prisma/schema.prisma`

**全モデル一覧**（Prisma schema.prisma より）:

| モデル名 | 用途 | レコード数（推定） | 移行要否 |
|---------|------|------------------|---------|
| `Account` | NextAuth OAuthアカウント | 少 | ❌ 不要（Supabase Auth管理） |
| `Session` | NextAuthセッション | 中 | ❌ 不要（Supabase Auth管理） |
| `VerificationToken` | メール検証トークン | 少 | ❌ 不要（Supabase Auth管理） |
| `User` | ユーザー情報 | 少 | ✅ 移行（auth.usersと連携） |
| `MeetingNote` | 議事録データ | 中 | ✅ 移行 |
| `Transcript` | NA原稿データ | 中 | ❌ 作成しない（現在未使用）|
| `chats` | チャット（一般・リサーチ・議事録・企画立案等） | 多 | ✅ 作成 |
| `chat_messages` | チャットメッセージ | 多（最多） | ✅ 作成 |
| `LocationSchedule` | ロケスケ管理 | 少 | ❌ 不要（未使用） |
| `UsageLog` | LLM使用ログ | 多 | ✅ 移行 |
| `ProgramSettings` | 番組設定（ユーザー別） | 少 | ❌ 作成しない（現在未使用）|
| `GrokToolSettings` | Grokツール設定（ユーザー別） | 少 | ❌ 不要（未使用） |
| `AppLog` | アプリケーションログ | 多 | ❌ 不要（未使用） |
| `SystemSettings` | システム設定KVストア | 少 | ❌ 作成しない（現在未使用）|
| `SystemPrompt` | システムプロンプト | 少 | ✅ 移行 |
| `SystemPromptVersion` | プロンプトバージョン履歴 | 中 | ✅ 移行 |
| `FeaturePrompt` | 機能→プロンプトマッピング | 少 | ✅ 移行 |

#### 1.2 Prisma → Supabase SQL変換マッピング

```sql
-- ============================================
-- 1. Enum型の作成
-- ============================================

-- LLMProvider Enum
CREATE TYPE llm_provider AS ENUM (
  'GEMINI_25_FLASH_LITE',
  'GEMINI_30_FLASH',
  'GROK_4_1_FAST_REASONING',
  'GROK_4_0709',
  'GPT_4O_MINI',
  'GPT_5',
  'CLAUDE_SONNET_45',
  'CLAUDE_OPUS_46',
  'PERPLEXITY_SONAR',
  'PERPLEXITY_SONAR_PRO'
);

-- ============================================
-- 2. テーブル作成（Prisma → Supabase）
-- ============================================

-- Usersテーブル（Supabase Auth の auth.users と連携）
-- auth.users.id と同じUUIDを使用
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  email_verified TIMESTAMPTZ,
  google_id TEXT UNIQUE,
  role TEXT DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MeetingNotesテーブル
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MEETING', 'INTERVIEW')),
  raw_text TEXT NOT NULL,
  formatted_text TEXT,
  llm_provider llm_provider DEFAULT 'GEMINI_25_FLASH_LITE',
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FORMATTING', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Transcriptsテーブルは現在未使用（Sidebarから削除済み）のため作成しない
-- 将来的に必要になった場合は以下のSQLを実行:
-- CREATE TABLE transcripts (...);

-- Chatsテーブル（一般チャット・リサーチ・議事録・企画立案等全て）
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  title TEXT,
  llm_provider llm_provider DEFAULT 'GROK_4_1_FAST_REASONING',
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ChatMessagesテーブル
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content TEXT NOT NULL,
  thinking TEXT,
  llm_provider llm_provider,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  tool_calls_json JSONB,
  citations_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UsageLogsテーブル
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: ProgramSettingsテーブルは現在未使用のため作成しない
-- 将来的に必要になった場合は以下のSQLを実行:
-- CREATE TABLE program_settings (...);

-- Note: SystemSettingsテーブルは現在未使用のため作成しない
-- 将来的に必要になった場合は以下のSQLを実行:
-- CREATE TABLE system_settings (
--   key TEXT PRIMARY KEY,
--   value TEXT NOT NULL,
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- SystemPromptsテーブル
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  current_version INTEGER DEFAULT 1,
  changed_by UUID REFERENCES users(id),
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SystemPromptVersionsテーブル（プロンプトバージョン履歴）
CREATE TABLE system_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);

-- FeaturePromptsテーブル（機能→プロンプトマッピング）
CREATE TABLE feature_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT UNIQUE NOT NULL,
  prompt_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. インデックス作成
-- ============================================

CREATE INDEX idx_meeting_notes_user_status_created ON meeting_notes(user_id, status, created_at);
CREATE INDEX idx_meeting_notes_user_created ON meeting_notes(user_id, created_at);
-- Note: transcriptsテーブル未使用のためインデックスも作成しない
-- CREATE INDEX idx_transcripts_user_created ON transcripts(user_id, created_at);
CREATE INDEX idx_chats_user_agent_created ON chats(user_id, agent_type, created_at);
CREATE INDEX idx_chats_user_created ON chats(user_id, created_at);
CREATE INDEX idx_chats_agent_type ON chats(agent_type);
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);
CREATE INDEX idx_usage_logs_user_provider_created ON usage_logs(user_id, provider, created_at);
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_logs_provider_created ON usage_logs(provider, created_at);
CREATE INDEX idx_usage_logs_created_cost ON usage_logs(created_at, cost);
CREATE INDEX idx_system_prompts_category ON system_prompts(category);
CREATE INDEX idx_system_prompts_is_active ON system_prompts(is_active);
CREATE INDEX idx_system_prompt_versions_prompt_created ON system_prompt_versions(prompt_id, created_at);
CREATE INDEX idx_feature_prompts_feature_id ON feature_prompts(feature_id);
CREATE INDEX idx_feature_prompts_prompt_key ON feature_prompts(prompt_key);
CREATE INDEX idx_feature_prompts_is_active ON feature_prompts(is_active);
```

#### 1.3 RLSポリシー設定

```sql
-- ============================================
-- 4. Row Level Security (RLS) 設定
-- ============================================

-- 注意: auth.uid() は UUID型を返すため、UUID同士の比較にキャスト不要

-- Usersテーブル
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- MeetingNotesテーブル
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own meeting notes" ON meeting_notes
  FOR ALL USING (auth.uid() = user_id);

-- Note: Transcriptsテーブルは現在未使用のためRLSポリシー不要

-- Chatsテーブル
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own chats" ON chats
  FOR ALL USING (auth.uid() = user_id);

-- ChatMessagesテーブル
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD messages in own chats" ON chat_messages
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM chats WHERE user_id = auth.uid()
    )
  );

-- UsageLogsテーブル
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Note: ProgramSettings, SystemSettingsテーブルは現在未使用のためRLSポリシー不要

-- SystemPromptsテーブル（全員閲覧、管理者のみ更新）
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prompts" ON system_prompts
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all prompts" ON system_prompts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can modify prompts" ON system_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- SystemPromptVersionsテーブル
ALTER TABLE system_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prompt versions" ON system_prompt_versions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify prompt versions" ON system_prompt_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- FeaturePromptsテーブル（全員閲覧、管理者のみ更新）
ALTER TABLE feature_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active feature prompts" ON feature_prompts
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Only admins can modify feature prompts" ON feature_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

#### 1.4 データ移行戦略

**重要: ユーザーIDのマッピング問題**

NextAuth.js（Neon）とSupabase AuthではユーザーIDの形式が異なります：

| 項目 | NextAuth.js (Neon) | Supabase Auth |
|------|-------------------|---------------|
| ユーザーID形式 | `cuid` または `uuid` | `uuid` |
| 保存場所 | `User.id` | `auth.users.id` |

**移行アプローチ**: 
- **アプローチA**: 既存ユーザーのメールアドレスでSupabase Authユーザーと紐付け、データの`user_id`を更新
- **アプローチB**（推奨）: 一括でSupabase Authユーザーを作成し、古いIDを新しいUUIDにマッピング

#### 1.5 データ移行手順（詳細版）

**Step 0: 事前準備**

```bash
# Neon DBから全データをエクスポート
pg_dump --data-only --no-owner --no-acl \
  --exclude-table="_prisma_migrations" \
  "$DATABASE_URL" > neon_data_dump.sql

# データ容量確認
psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Step 1: スキーマ適用後のデータ移行準備**

```sql
-- Supabase SQL Editorで実行

-- 1. 外部キー制約を一時的に無効化（データロード用）
ALTER TABLE meeting_notes DISABLE TRIGGER ALL;
-- Note: transcriptsテーブル未使用
ALTER TABLE chats DISABLE TRIGGER ALL;
ALTER TABLE chat_messages DISABLE TRIGGER ALL;
ALTER TABLE usage_logs DISABLE TRIGGER ALL;
ALTER TABLE system_prompts DISABLE TRIGGER ALL;

-- 2. RLSを一時的に無効化（サービスロールでの移行時）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes DISABLE ROW LEVEL SECURITY;
-- Note: transcriptsテーブル未使用
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;
```

**Step 2: ユーザーデータの移行（重要）**

```sql
-- Supabase SQL Editorで実行

-- NextAuthのUserテーブルデータをSupabaseのpublic.usersに移行
-- 注意: Supabase Authのauth.usersは自動作成されるため、public.usersにのみ挿入

-- 既存ユーザーの確認（メールアドレスで紐付け）
WITH neon_users AS (
  SELECT * FROM pg_temp.neon_users
),
supabase_users AS (
  SELECT id, email FROM auth.users
)
SELECT 
  n.id as neon_user_id,
  n.email,
  s.id as supabase_user_id
FROM neon_users n
LEFT JOIN supabase_users s ON n.email = s.email;

-- 紐付けテーブル作成（一時的）
CREATE TABLE temp_user_id_mapping (
  neon_user_id TEXT PRIMARY KEY,
  supabase_user_id UUID NOT NULL,
  email TEXT NOT NULL
);

-- マッピングデータ投入（後でStep 3で使用）
-- ※ 実際はスクリプトで自動化
```

**Step 3: Node.js移行スクリプト（推奨）**

```typescript
// scripts/migrate-data-to-supabase.ts
/**
 * Neon → Supabase データ移行スクリプト
 * 
 * 使用方法:
 * 1. .env.local に両方の接続情報を設定
 * 2. npx tsx scripts/migrate-data-to-supabase.ts
 */

import { createClient as createNeonClient } from '@neondatabase/serverless'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface NeonUser {
  id: string
  email: string
  name: string | null
  image: string | null
  email_verified: Date | null
  google_id: string | null
  role: string
  created_at: Date
  updated_at: Date
}

interface NeonMeetingNote {
  id: string
  user_id: string
  type: string
  raw_text: string
  formatted_text: string | null
  llm_provider: string
  status: string
  created_at: Date
  updated_at: Date
}

interface NeonChat {
  id: string
  user_id: string
  agent_type: string
  title: string | null
  llm_provider: string
  results: any
  created_at: Date
  updated_at: Date
}

interface NeonChatMessage {
  id: string
  chat_id: string
  role: string
  content: string
  thinking: string | null
  llm_provider: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  tool_calls_json: any
  citations_json: any
  created_at: Date
}

async function migrate() {
  console.log('🚀 データ移行を開始します...')
  
  // クライアント初期化
  const neon = createNeonClient({ connectionString: NEON_DATABASE_URL })
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // ユーザーIDマッピング
  const userIdMapping = new Map<string, string>()
  
  try {
    // ===== Step 1: ユーザー移行 =====
    console.log('\n👤 ユーザーデータを移行中...')
    const { rows: neonUsers } = await neon.query<NeonUser>('SELECT * FROM "User"')
    console.log(`  ${neonUsers.length}件のユーザーを検出`)
    
    for (const neonUser of neonUsers) {
      // Supabase Authにユーザー作成
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: neonUser.email,
        email_confirm: true,
        user_metadata: {
          name: neonUser.name,
          image: neonUser.image,
          role: neonUser.role,
        },
      })
      
      if (authError) {
        console.error(`  ❌ ユーザー作成失敗: ${neonUser.email}`, authError)
        continue
      }
      
      const supabaseUserId = authUser.user!.id
      userIdMapping.set(neonUser.id, supabaseUserId)
      
      // public.usersテーブルに追加情報を挿入
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: supabaseUserId,
          email: neonUser.email,
          name: neonUser.name,
          image: neonUser.image,
          email_verified: neonUser.email_verified?.toISOString(),
          google_id: neonUser.google_id,
          role: neonUser.role,
          created_at: neonUser.created_at.toISOString(),
          updated_at: neonUser.updated_at.toISOString(),
        })
      
      if (userError) {
        console.error(`  ❌ public.users挿入失敗: ${neonUser.email}`, userError)
      } else {
        console.log(`  ✅ ${neonUser.email} → ${supabaseUserId}`)
      }
    }
    
    // ===== Step 2: MeetingNotes移行 =====
    console.log('\n📝 MeetingNotesを移行中...')
    const { rows: meetingNotes } = await neon.query<NeonMeetingNote>('SELECT * FROM "MeetingNote"')
    
    const migratedMeetingNotes = meetingNotes.map(note => ({
      id: note.id,
      user_id: userIdMapping.get(note.user_id) || note.user_id,
      type: note.type,
      raw_text: note.raw_text,
      formatted_text: note.formatted_text,
      llm_provider: note.llm_provider,
      status: note.status,
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at.toISOString(),
    }))
    
    // バッチ挿入（100件ずつ）
    const batchSize = 100
    for (let i = 0; i < migratedMeetingNotes.length; i += batchSize) {
      const batch = migratedMeetingNotes.slice(i, i + batchSize)
      const { error } = await supabase.from('meeting_notes').insert(batch)
      if (error) {
        console.error(`  ❌ MeetingNotesバッチ ${i}-${i + batch.length} 失敗:`, error)
      } else {
        console.log(`  ✅ MeetingNotesバッチ ${i}-${i + batch.length} 完了`)
      }
    }
    
    // ===== Step 3: Transcripts移行 =====
    console.log('\n📄 Transcriptsを移行中...')
    const { rows: transcripts } = await neon.query('SELECT * FROM "Transcript"')
    
    const migratedTranscripts = transcripts.map(t => ({
      ...t,
      user_id: userIdMapping.get(t.user_id) || t.user_id,
      created_at: t.created_at.toISOString(),
      updated_at: t.updated_at.toISOString(),
    }))
    
    for (let i = 0; i < migratedTranscripts.length; i += batchSize) {
      const batch = migratedTranscripts.slice(i, i + batchSize)
      const { error } = await supabase.from('transcripts').insert(batch)
      if (error) {
        console.error(`  ❌ Transcriptsバッチ ${i} 失敗:`, error)
      }
    }
    console.log(`  ✅ ${transcripts.length}件のTranscriptsを移行`)
    
    // ===== Step 4: Chats移行 =====
    console.log('\n💬 Chatsを移行中...')
    const { rows: researchChats } = await neon.query<NeonChat>('SELECT * FROM "ResearchChat"')
    
    const migratedChats = researchChats.map(chat => ({
      id: chat.id,
      user_id: userIdMapping.get(chat.user_id) || chat.user_id,
      agent_type: chat.agent_type,
      title: chat.title,
      llm_provider: chat.llm_provider,
      results: chat.results,
      created_at: chat.created_at.toISOString(),
      updated_at: chat.updated_at.toISOString(),
    }))
    
    for (let i = 0; i < migratedChats.length; i += batchSize) {
      const batch = migratedChats.slice(i, i + batchSize)
      const { error } = await supabase.from('chats').insert(batch)
      if (error) {
        console.error(`  ❌ Chatsバッチ ${i} 失敗:`, error)
      }
    }
    console.log(`  ✅ ${researchChats.length}件のChatsを移行`)
    
    // ===== Step 5: ChatMessages移行 =====
    console.log('\n💭 ChatMessagesを移行中...')
    const { rows: researchMessages } = await neon.query<NeonChatMessage>('SELECT * FROM "ResearchMessage"')
    
    const migratedMessages = researchMessages.map(msg => ({
      id: msg.id,
      chat_id: msg.chat_id,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking,
      llm_provider: msg.llm_provider,
      input_tokens: msg.input_tokens,
      output_tokens: msg.output_tokens,
      cost_usd: msg.cost_usd,
      tool_calls_json: msg.tool_calls_json,
      citations_json: msg.citations_json,
      created_at: msg.created_at.toISOString(),
    }))
    
    // メッセージは件数が多い可能性があるので、50件ずつ
    const msgBatchSize = 50
    for (let i = 0; i < migratedMessages.length; i += msgBatchSize) {
      const batch = migratedMessages.slice(i, i + msgBatchSize)
      const { error } = await supabase.from('chat_messages').insert(batch)
      if (error) {
        console.error(`  ❌ ChatMessagesバッチ ${i} 失敗:`, error)
      }
      
      if (i % 500 === 0) {
        console.log(`  ⏳ ${i}/${migratedMessages.length}件処理中...`)
      }
    }
    console.log(`  ✅ ${researchMessages.length}件のChatMessagesを移行`)
    
    // ===== Step 6: UsageLogs移行 =====
    console.log('\n📊 UsageLogsを移行中...')
    const { rows: usageLogs } = await neon.query('SELECT * FROM "UsageLog"')
    
    const migratedLogs = usageLogs.map(log => ({
      ...log,
      user_id: userIdMapping.get(log.user_id) || log.user_id,
      created_at: log.created_at.toISOString(),
    }))
    
    for (let i = 0; i < migratedLogs.length; i += batchSize) {
      const batch = migratedLogs.slice(i, i + batchSize)
      const { error } = await supabase.from('usage_logs').insert(batch)
      if (error) {
        console.error(`  ❌ UsageLogsバッチ ${i} 失敗:`, error)
      }
    }
    console.log(`  ✅ ${usageLogs.length}件のUsageLogsを移行`)
    
    // ===== Step 7: SystemPrompts移行 =====
    console.log('\n⚙️ SystemPromptsを移行中...')
    const { rows: systemPrompts } = await neon.query('SELECT * FROM "SystemPrompt"')
    
    const migratedPrompts = systemPrompts.map(prompt => ({
      id: prompt.id,
      key: prompt.key,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
      is_active: prompt.is_active,
      current_version: prompt.current_version,
      changed_by: prompt.changed_by ? userIdMapping.get(prompt.changed_by) : null,
      change_note: prompt.change_note,
      created_at: prompt.created_at.toISOString(),
      updated_at: prompt.updated_at.toISOString(),
    }))
    
    const { error: promptError } = await supabase.from('system_prompts').insert(migratedPrompts)
    if (promptError) {
      console.error('  ❌ SystemPrompts移行失敗:', promptError)
    } else {
      console.log(`  ✅ ${systemPrompts.length}件のSystemPromptsを移行`)
    }
    
    // ===== マッピング情報保存 =====
    console.log('\n💾 マッピング情報を保存...')
    const mappingData = Array.from(userIdMapping.entries()).map(([neonId, supabaseId]) => ({
      neon_user_id: neonId,
      supabase_user_id: supabaseId,
    }))
    
    // ローカルファイルに保存（バックアップ用）
    const fs = await import('fs')
    fs.writeFileSync(
      'user-id-mapping-backup.json',
      JSON.stringify(mappingData, null, 2)
    )
    console.log('  ✅ user-id-mapping-backup.jsonに保存')
    
    console.log('\n✨ データ移行が完了しました！')
    
  } catch (error) {
    console.error('\n💥 移行中にエラーが発生しました:', error)
    process.exit(1)
  }
}

migrate()
```

**Step 4: 移行後の整合性チェック**

```typescript
// scripts/verify-migration.ts
/**
 * 移行後のデータ整合性検証スクリプト
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verify() {
  console.log('🔍 データ整合性を検証中...\n')
  
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  const checks = [
    { name: 'Users', table: 'users' },
    { name: 'MeetingNotes', table: 'meeting_notes' },
    { name: 'Transcripts', table: 'transcripts' },
    { name: 'Chats', table: 'chats' },
    { name: 'ChatMessages', table: 'chat_messages' },
    { name: 'UsageLogs', table: 'usage_logs' },
    { name: 'SystemPrompts', table: 'system_prompts' },
  ]
  
  for (const check of checks) {
    const { count, error } = await supabase
      .from(check.table)
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(`  ❌ ${check.name}: エラー - ${error.message}`)
    } else {
      console.log(`  ✅ ${check.name}: ${count}件`)
    }
  }
  
  // 外部キー整合性チェック
  console.log('\n🔗 外部キー整合性チェック...')
  
  const { data: orphanedNotes, error: notesError } = await supabase
    .from('meeting_notes')
    .select('id, user_id')
    .not('user_id', 'in', supabase.from('users').select('id'))
  
  if (notesError) {
    console.log(`  ⚠️ MeetingNotes整合性チェックエラー: ${notesError.message}`)
  } else if (orphanedNotes && orphanedNotes.length > 0) {
    console.log(`  ❌ MeetingNotes: ${orphanedNotes.length}件の孤立レコード`)
  } else {
    console.log('  ✅ MeetingNotes: 整合性OK')
  }
  
  console.log('\n✨ 検証完了！')
}

verify()
```

**Step 5: RLS再有効化**

```sql
-- データ移行完了後、RLSとトリガーを再有効化

-- RLS再有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
-- Note: transcriptsテーブル未使用
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- トリガー再有効化
ALTER TABLE meeting_notes ENABLE TRIGGER ALL;
-- Note: transcriptsテーブル未使用
ALTER TABLE chats ENABLE TRIGGER ALL;
ALTER TABLE chat_messages ENABLE TRIGGER ALL;
ALTER TABLE usage_logs ENABLE TRIGGER ALL;
ALTER TABLE system_prompts ENABLE TRIGGER ALL;

-- シーケンスリセット（必要に応じて）
SELECT setval('meeting_notes_id_seq', (SELECT MAX(id) FROM meeting_notes));
-- Note: transcriptsテーブル未使用
-- SELECT setval('transcripts_id_seq', (SELECT MAX(id) FROM transcripts));
SELECT setval('chats_id_seq', (SELECT MAX(id) FROM chats));
SELECT setval('chat_messages_id_seq', (SELECT MAX(id) FROM chat_messages));
SELECT setval('usage_logs_id_seq', (SELECT MAX(id) FROM usage_logs));
SELECT setval('system_prompts_id_seq', (SELECT MAX(id) FROM system_prompts));
```

#### 1.5 スキーマ適用チェックリスト

- [ ] Supabase DashboardでSQL Editorを開く
- [ ] Enum型を作成
- [ ] テーブルを作成
- [ ] インデックスを作成
- [ ] RLSを有効化（データ移行時は無効化）
- [ ] RLSポリシーを設定（データ移行後に適用）
- [ ] データを移行（必要に応じて）
- [ ] テストデータで動作確認

#### 1.6 データ移行チェックリスト

**移行前**
- [ ] Neon DBのバックアップ取得
- [ ] 各テーブルのレコード数を記録
- [ ] ユーザーIDマッピング戦略を決定
- [ ] 移行スクリプトをテスト環境で検証

**移行中**
- [ ] サービスロールキーを使用してデータ移行
- [ ] 各テーブルの移行件数を確認
- [ ] ユーザーIDマッピングファイルを保存
- [ ] 外部キー整合性を検証

**移行後**
- [ ] RLSポリシーを再有効化
- [ ] トリガーを再有効化
- [ ] シーケンスをリセット
- [ ] サンプルユーザーでデータアクセス確認
- [ ] 各テーブルの件数がNeonと一致することを確認

---

### ステップ2: 既存データ移行（Neon → Supabase）（4-8時間）

> **重要**: このステップはステップ1（スキーマ作成）**完了後**、ステップ3（認証移行）**前**に実施

#### 2.1 データ移行の方針

**プロンプト 3 テーブルのみ全レコードを移行する。ユーザーデータは移行しない。**

| 対象 | テーブル | 移行内容 |
|------|----------|----------|
| ✅ 移行 | `system_prompts` | 管理画面で編集したプロンプト本文（全レコード） |
| ✅ 移行 | `system_prompt_versions` | プロンプトのバージョン履歴（全レコード） |
| ✅ 移行 | `feature_prompts` | 機能ID ↔ プロンプトキーのマッピング（全レコード） |

| 対象 | テーブル | 理由 |
|------|----------|------|
| ❌ 移行しない | `users` | Supabase Auth でログイン時に自動作成される |
| ❌ 移行しない | `meeting_notes` | 過去の議事録は引き継がない |
| ❌ 移行しない | `transcripts` | 現在未使用（Sidebar削除済み）、スキーマも作成しない |
| ❌ 移行しない | `chats`, `chat_messages` | 過去のチャット履歴は引き継がない（旧: research_chats/research_messages）|
| ❌ 移行しない | `usage_logs` | 使用量ログは引き継がない |
| ❌ 移行しない | `program_settings` | 現在未使用、スキーマも作成しない |
| ❌ 移行しない | `system_settings` | 現在未使用、スキーマも作成しない |

> **スキーマ作成しないテーブル**: `transcripts`, `program_settings`, `system_settings`, `LocationSchedule`, `GrokToolSettings`, `AppLog`（現在未使用）
> 
> **移行対象外（Supabase Auth管理）**: `Account`, `Session`, `VerificationToken`

#### 2.2 移行手順

**方法**: Neon DB から 3 テーブルのレコードを読み取り、Supabase に INSERT するスクリプトを実行する。

```bash
# 1. 移行スクリプト実行（プロンプト3テーブルのみ）
npx tsx scripts/migrate-prompts-to-supabase.ts

# 2. 検証
npx tsx scripts/migrate-prompts-to-supabase.ts --verify
```

**移行の流れ**:

1. Neon の `SystemPrompt` → Supabase `system_prompts` へ全レコード INSERT
   - カラム名マッピング: `currentVersion` → `current_version`, `changedBy` → `changed_by`, `changeNote` → `change_note`, `isActive` → `is_active`, `createdAt` → `created_at`, `updatedAt` → `updated_at`
   - `changed_by` は UUID 外部キーのため、移行時は `NULL` に設定（旧ユーザーIDは Supabase に存在しないため）
2. Neon の `SystemPromptVersion` → Supabase `system_prompt_versions` へ全レコード INSERT
   - `prompt_id` は上記でマッピング済みの ID を使用（Neon/Supabase 共に UUID なのでそのまま使える場合はそのまま）
   - カラム名マッピング: `promptId` → `prompt_id`, `changedBy` → `changed_by`, `changeNote` → `change_note`, `createdAt` → `created_at`
3. Neon の `FeaturePrompt` → Supabase `feature_prompts` へ全レコード INSERT
   - カラム名マッピング: `featureId` → `feature_id`, `promptKey` → `prompt_key`, `isActive` → `is_active`, `createdAt` → `created_at`, `updatedAt` → `updated_at`

**注意事項**:

- `system_prompts.changed_by` は Neon の旧ユーザーID（cuid）で、Supabase の `users.id`（UUID）と互換性がない。移行時は `NULL` にする
- `system_prompt_versions.changed_by` は `TEXT` 型のため、旧値をそのまま入れてもエラーにはならない
- 3 テーブルともレコード数が少ないため、移行は数秒で完了する

#### 2.3 移行後の検証

- [ ] `system_prompts` のレコード数が Neon と一致
- [ ] `system_prompt_versions` のレコード数が Neon と一致
- [ ] `feature_prompts` のレコード数が Neon と一致
- [ ] 管理画面（`/admin/prompts`）でプロンプト一覧が表示される
- [ ] プロンプトのバージョン履歴が正しく表示される

---

### ステップ3: 認証システム移行（12-16時間）

#### 2.1 Supabase Authセットアップ

**Supabase Dashboardでの設定**:

1. **Authentication → Providers → Google を有効化**
   - Client ID: `GOOGLE_CLIENT_ID`（既存の値を流用）
   - Client Secret: `GOOGLE_CLIENT_SECRET`（既存の値を流用）
   - Authorized redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`

2. **URL設定**
   - Site URL: `https://[your-domain].vercel.app`
   - Redirect URLs: `https://[your-domain].vercel.app/auth/callback`

3. **Email設定（必要に応じて）**
   - Confirm email: 無効（今回はGoogle認証のみ）

#### 2.2 パッケージインストール

```bash
# Supabase関連パッケージをインストール
npm install @supabase/supabase-js @supabase/ssr

# NextAuth関連パッケージを削除（後で）
# npm uninstall next-auth @auth/prisma-adapter
```

#### 2.3 環境変数設定

```bash
# .env.local（開発環境）
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Google OAuth（既存のものを流用）
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# 削除（NextAuth用）
# NEXTAUTH_SECRET=xxx
# NEXTAUTH_URL=xxx
```

#### 2.4 Supabase Client設定ファイル作成

**新規ファイル: `lib/supabase/client.ts`**

```typescript
/**
 * Supabase Client設定
 * ブラウザ用クライアント
 */
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**新規ファイル: `lib/supabase/server.ts`**

```typescript
/**
 * Supabase Server Client設定
 * Server Components / Server Actions用
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set({ name, value, ...options })
        },
        remove: (name, options) => {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

**新規ファイル: `lib/supabase/middleware.ts`**

```typescript
/**
 * Supabase Middleware Client設定
 * middleware.ts用
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // セッションの更新と取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

#### 2.5 middleware.tsの更新

**既存ファイル: `middleware.ts`（書き換え）**

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// 認証不要なパス
const PUBLIC_PATHS = ['/', '/auth/signin', '/auth/error', '/preview-login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公開パスはスキップ
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // 静的アセットはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Supabaseセッションを更新・取得
  const { supabaseResponse, user } = await updateSession(request)

  // 認証が必要なパスへのアクセスをチェック
  if (pathname.startsWith('/(authenticated)') || 
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/')) {
    if (!user) {
      // 未認証→サインインページへ
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

#### 2.6 サインインページの更新

**既存ファイル: `app/auth/signin/page.tsx`（書き換え）**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile',
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サインインに失敗しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6">
        <h1 className="text-2xl font-bold mb-6">サインイン</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '読み込み中...' : 'Googleでサインイン'}
        </button>
      </div>
    </div>
  )
}
```

#### 2.7 認証コールバックページの作成

**新規ファイル: `app/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set({ name, value, ...options })
          },
          remove: (name, options) => {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // エラー時はサインインページへ
  return NextResponse.redirect(`${origin}/auth/error`)
}
```

#### 2.8 API認証ヘルパーの更新

**既存ファイル: `lib/api/auth.ts`（書き換え）**

```typescript
/**
 * API認証ユーティリティ（Supabase版）
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface AuthenticatedUser {
  id: string
  email?: string | null
}

export interface AuthResult {
  user: AuthenticatedUser
  userId: string
}

/**
 * Supabaseクライアントを作成
 */
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set({ name, value, ...options })
        },
        remove: (name, options) => {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * APIリクエストの認証を行う
 */
export async function requireAuth(_req: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      )
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      userId: user.id,
    }
  } catch (error) {
    console.error('認証チェックエラー:', error)
    return NextResponse.json(
      { error: '認証処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * オプショナル認証
 */
export async function optionalAuth(_req: NextRequest): Promise<AuthResult | null> {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return {
      user: { id: user.id, email: user.email },
      userId: user.id,
    }
  } catch (error) {
    console.error('認証チェックエラー:', error)
    return null
  }
}

/**
 * 管理者権限チェック
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult

  // TODO: DBからユーザーロールを確認
  // const supabase = await createSupabaseClient()
  // const { data: userData } = await supabase
  //   .from('users')
  //   .select('role')
  //   .eq('id', authResult.userId)
  //   .single()
  //
  // if (userData?.role !== 'ADMIN') {
  //   return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  // }

  return authResult
}
```

---

### ステップ4: DB操作コード移行（40-60時間）

#### 3.1 移行対象ファイル一覧（実コードベース調査結果）

**優先度: 🔴 高（認証関連 → 削除 or 書き換え）**

| ファイル | 内容 | 変更内容 |
|---------|------|---------|
| `lib/prisma.ts` | Prisma Client設定 | 削除 |
| `lib/auth-options.ts` | NextAuth設定 | 削除 |
| `lib/api/auth.ts` | API認証ヘルパー | Supabase Auth書き換え（ステップ3） |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth Route | 削除 |

**優先度: 🔴 高（主要機能 → Prisma→Supabase書き換え）**

| ファイル | 内容 | Prisma使用箇所 |
|---------|------|---------------|
| `app/api/chat/history/route.ts` | チャット履歴 | `prisma.researchChat` |
| `app/api/chat/feature/route.ts` | 機能別チャットCRUD | `prisma.researchChat`, `prisma.researchMessage` |
| `app/api/research/route.ts` | リサーチAPI | `prisma` import（要確認） |
| `lib/prompts/db/crud.ts` | プロンプトCRUD | `prisma.systemPrompt`, `prisma.featurePrompt` |
| `lib/prompts/db/version.ts` | バージョン管理 | `prisma.systemPrompt`, `prisma.systemPromptVersion`, `prisma.$transaction` |
| `lib/prompts/db/versions.ts` | バージョン履歴 | `prisma.systemPromptVersion`, `prisma.systemPrompt` |
| `lib/prompts/db/seed.ts` | プロンプトシード | `prisma.systemPrompt`, `prisma.systemPromptVersion` |
| `lib/prompts/system-prompt.ts` | プロンプトビルダー | `prisma.featurePrompt` |
| `lib/usage/tracker.ts` | 使用追跡 | `prisma.usageLog` |
| `lib/settings/db.ts` | 設定DB層 | `prisma.systemSettings`, `prisma.programSettings`, `prisma.grokToolSettings` |

**優先度: 🟡 中（管理機能）**

| ファイル | 内容 | Prisma使用箇所 |
|---------|------|---------------|
| `app/api/admin/users/route.ts` | ユーザー管理 | `prisma.user` |
| `app/api/admin/users/[id]/role/route.ts` | ロール変更 | `prisma.user` |
| `app/api/admin/prompts/route.ts` | プロンプト管理 | `prisma.systemPrompt` |
| `app/api/admin/prompts/[key]/route.ts` | 個別プロンプト | `prisma.systemPrompt` |
| `app/api/admin/prompts/[key]/history/route.ts` | 履歴 | `prisma.systemPromptVersion` |
| `app/api/admin/prompts/[key]/restore/route.ts` | バージョン復元 | `prisma.systemPrompt`, `prisma.systemPromptVersion` |
| `app/api/admin/logs/route.ts` | ログ管理 | `prisma.appLog` → 未使用のため削除候補 |
| `app/api/admin/usage/route.ts` | 使用状況 | `prisma.usageLog`, `prisma.$queryRaw` |
| `app/api/admin/programs/route.ts` | 番組管理 | `prisma.programSettings` |

**優先度: 🟡 中（その他API）**

| ファイル | 内容 | Prisma使用箇所 |
|---------|------|---------------|
| `app/api/llm/usage/route.ts` | LLM使用量 | `prisma.usageLog` |
| `app/api/prompts/route.ts` | プロンプトAPI | `prisma.systemPrompt` |
| `app/api/prompts/[key]/versions/route.ts` | バージョンAPI | `prisma.systemPromptVersion` |

**優先度: 🟢 低（スクリプト・テスト）**

| ファイル | 内容 | 対応 |
|---------|------|------|
| `scripts/check-prompt-usage.ts` | プロンプト使用確認 | Supabase書き換え |
| `scripts/delete-unused-prompts.ts` | 未使用プロンプト削除 | Supabase書き換え |
| `tests/lib/prompts/db.test.ts` | プロンプトDBテスト | Supabase書き換え |
| `tests/lib/prompts/system-prompt.test.ts` | プロンプトテスト | Supabase書き換え |

#### 3.2 Prisma → Supabase Client 変換パターン

**パターン1: SELECT（単一レコード）**

```typescript
// Prisma（変更前）
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, name: true, role: true }
})

// Supabase（変更後）
const { data: user, error } = await supabase
  .from('users')
  .select('id, email, name, role')
  .eq('id', userId)
  .single()

if (error) throw error
```

**パターン2: SELECT（複数レコード + リレーション）**

```typescript
// Prisma（変更前）
const chats = await prisma.researchChat.findMany({
  where: { userId },
  include: {
    messages: {
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
    _count: {
      select: { messages: true },
    },
  },
  orderBy: { updatedAt: 'desc' },
})

// Supabase（変更後）- 2クエリに分割
const { data: chats, error: chatsError } = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })

if (chatsError) throw chatsError

// メッセージカウントと最新メッセージを別途取得
const chatIds = chats.map(c => c.id)
const { data: messages, error: msgError } = await supabase
  .from('chat_messages')
  .select('chat_id, content, created_at')
  .in('chat_id', chatIds)
  .order('created_at', { ascending: false })

// マッピング処理
const chatsWithDetails = chats.map(chat => ({
  ...chat,
  messages: messages?.filter(m => m.chat_id === chat.id).slice(0, 1) || [],
  messageCount: messages?.filter(m => m.chat_id === chat.id).length || 0,
}))
```

**パターン3: INSERT**

```typescript
// Prisma（変更前）
const newChat = await prisma.researchChat.create({
  data: {
    userId,
    agentType: 'RESEARCH-CAST',
    title: '新しいチャット',
  },
})

// Supabase（変更後）
const { data: newChat, error } = await supabase
  .from('chats')
  .insert({
    user_id: userId,
    agent_type: 'RESEARCH-CAST',
    title: '新しいチャット',
  })
  .select()
  .single()

if (error) throw error
```

**パターン4: UPDATE**

```typescript
// Prisma（変更前）
const updated = await prisma.researchChat.update({
  where: { id: chatId },
  data: { title: newTitle, updatedAt: new Date() },
})

// Supabase（変更後）
const { data: updated, error } = await supabase
  .from('chats')
  .update({ title: newTitle, updated_at: new Date().toISOString() })
  .eq('id', chatId)
  .select()
  .single()

if (error) throw error
```

**パターン5: DELETE**

```typescript
// Prisma（変更前）
await prisma.researchChat.delete({
  where: { id: chatId },
})

// Supabase（変更後）
const { error } = await supabase
  .from('chats')
  .delete()
  .eq('id', chatId)

if (error) throw error
```

**パターン6: トランザクション（複数操作）**

```typescript
// Prisma（変更前）
await prisma.$transaction([
  prisma.researchChat.create({ data: { ... } }),
  prisma.researchMessage.createMany({ data: messages }),
])

// Supabase（変更後）- RPC関数または順次実行
// 方法1: 順次実行（RLSで保護される）
const { data: chat, error: chatError } = await supabase
  .from('chats')
  .insert({ ... })
  .select()
  .single()

if (chatError) throw chatError

const { error: msgError } = await supabase
  .from('chat_messages')
  .insert(messages.map(m => ({ ...m, chat_id: chat.id })))

if (msgError) throw msgError

// 方法2: RPC関数（複雑なトランザクション用）
// const { data, error } = await supabase.rpc('create_chat_with_messages', {
//   chat_data: { ... },
//   messages_data: messages
// })
```

#### 3.3 実装例: chat/history/route.ts の完全移行

```typescript
/**
 * Chat History API Route（Supabase移行版）
 */
import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export interface ChatHistoryItem {
  id: string
  featureId: string
  title: string
  agentType: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
}

function getAgentTypeLabel(agentType: string): string {
  const labels: Record<string, string> = {
    'RESEARCH-CAST': '出演者リサーチ',
    'RESEARCH-LOCATION': '場所リサーチ',
    'RESEARCH-INFO': '情報リサーチ',
    'RESEARCH-EVIDENCE': 'エビデンスリサーチ',
    MINUTES: '議事録作成',
    PROPOSAL: '新企画立案',
    'NA-SCRIPT': 'NA原稿作成',
    'GENERAL-CHAT': 'チャット',
  }
  return labels[agentType.toUpperCase()] || 'チャット'
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    
    const userId = authResult.user.id
    const supabase = await createClient()

    // チャット一覧を取得
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, agent_type, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (chatsError) throw chatsError

    if (!chats || chats.length === 0) {
      return Response.json({ history: [] })
    }

    // メッセージ情報を取得
    const chatIds = chats.map(c => c.id)
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('chat_id, content, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })

    if (msgError) throw msgError

    // メッセージをchat_idでグループ化
    const messagesByChat = messages?.reduce((acc, msg) => {
      if (!acc[msg.chat_id]) acc[msg.chat_id] = []
      acc[msg.chat_id].push(msg)
      return acc
    }, {} as Record<string, typeof messages>) || {}

    // レスポンスを構築
    const history: ChatHistoryItem[] = chats.map((chat) => {
      const chatMessages = messagesByChat[chat.id] || []
      const lastMessage = chatMessages[0]
      const title = chat.title || 
        (lastMessage?.content.slice(0, 30) || getAgentTypeLabel(chat.agent_type))

      return {
        id: chat.id,
        featureId: chat.agent_type.toLowerCase().replace(/_/g, '-'),
        title: title.length > 30 ? `${title}...` : title,
        agentType: getAgentTypeLabel(chat.agent_type),
        updatedAt: chat.updated_at,
        messageCount: chatMessages.length,
        lastMessage: lastMessage?.content.slice(0, 100),
      }
    })

    return Response.json({ history })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[${requestId}] Failed to get chat history`, { error: errorMessage })
    return Response.json(
      { error: 'Failed to get chat history', requestId },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) return authResult
    
    const userId = authResult.user.id
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('id')

    if (!chatId) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // RLSポリシーにより、ユーザー自身のチャットのみ削除可能
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`[${requestId}] Failed to delete chat`, { error: errorMessage })
    return Response.json(
      { error: 'Failed to delete chat', requestId },
      { status: 500 }
    )
  }
}
```

---

### ステップ5: 環境変数・設定更新（2-4時間）

#### 4.1 環境変数一覧

**必要な環境変数**:

```bash
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Google OAuth（必須・既存流用）
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# LLM API Keys（既存維持）
GEMINI_API_KEY=xxx
XAI_API_KEY=xxx
PERPLEXITY_API_KEY=xxx

# Preview環境用（必要に応じて）
VERCEL_ENV=preview
PREVIEW_E2E_USER=test@example.com
PREVIEW_E2E_PASS=xxx
```

**削除する環境変数**:

```bash
# NextAuth用（削除）
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=xxx

# Neon用（削除・Supabaseに移行）
DATABASE_URL=xxx
```

#### 4.2 Vercel環境変数設定手順

1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. 以下を追加:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. `NEXTAUTH_SECRET`と`NEXTAUTH_URL`を削除
4. 古い`DATABASE_URL`（Neon）を削除
5. Redeploy実行

#### 4.3 package.json更新

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.6.0",
    "@supabase/supabase-js": "^2.49.0"
    // "next-auth": "^4.24.13" - 削除
    // "@auth/prisma-adapter": "^2.11.1" - 削除
  },
  "devDependencies": {
    // "prisma": "^5.22.0" - 削除（または開発用に維持）
  }
}
```

---

### ステップ6: テスト・検証（12-16時間）

#### 6.1 テスト項目チェックリスト

**認証フロー**:
- [ ] Google OAuthサインイン
- [ ] セッション維持（ページ遷移）
- [ ] サインアウト
- [ ] 未認証時のリダイレクト

**データベース操作**:
- [ ] ユーザー作成（初回サインイン）
- [ ] チャット作成
- [ ] メッセージ保存
- [ ] チャット一覧取得
- [ ] チャット削除
- [ ] 議事録保存
- [ ] NA原稿保存

**RLSポリシー**:
- [ ] 他ユーザーのデータが見えない
- [ ] 他ユーザーのデータを編集・削除できない
- [ ] 管理者はプロンプトを編集できる

**管理機能**:
- [ ] ユーザー一覧（管理者）
- [ ] プロンプト編集（管理者）
- [ ] 使用状況表示

#### 6.2 E2Eテスト更新

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

setup('create test user', async () => {
  // テストユーザーを作成
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'e2e-test@example.com',
    password: 'test-password-123',
    email_confirm: true,
  })
  
  if (error) throw error
  
  // storageStateに保存してテスト間で共有
  // ...
})
```

---

### ステップ7: `npm run build` による最終ビルド検証（2-4時間）

#### 7.1 ビルド検証手順

```bash
# 1. 型チェック
npx tsc --noEmit

# 2. ビルド実行
npm run build

# 3. ビルドエラーがあれば修正
```

#### 7.2 確認事項

- [ ] 型エラーが0件
- [ ] ビルドが成功
- [ ] 警告が最小限

---

### ステップ8: 不要ファイル削除 & パッケージ整理（2-4時間）

> **注意**: 本ステップはステップ7（ビルド検証）とデータ移行完了後に実施すること

#### 8.1 削除するファイル

| ファイル | 理由 |
|---------|------|
| `lib/auth-options.ts` | NextAuth設定不要 |
| `lib/prisma.ts` | Prisma Client不要 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth Route不要 |
| `app/api/admin/logs/route.ts` | AppLog未使用のため不要 |
| `prisma/schema.prisma` | Supabaseで管理（参考用に残してもよい） |
| `prisma/migrations/` | Supabaseで管理 |

#### 8.2 パッケージの整理

```bash
# 削除
npm uninstall next-auth @auth/prisma-adapter

# 開発用に維持または削除（マイグレーション完了後）
npm uninstall prisma @prisma/client  # または devDependenciesに移動
```

#### 8.3 その他のクリーンアップ

- 未使用の型定義やimportの整理
- `.env.example` の更新（Neon関連削除、Supabase関連追加）

---

## 3. ファイル別移行マッピング

### 3.1 削除するファイル

| ファイル | 理由 |
|---------|------|
| `lib/auth-options.ts` | NextAuth設定不要 |
| `lib/prisma.ts` | Prisma Client不要 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth Route不要 |
| `app/api/admin/logs/route.ts` | AppLog未使用のため不要 |
| `prisma/schema.prisma` | Supabaseで管理（参考用に残してもよい） |
| `prisma/migrations/` | Supabaseで管理 |

### 3.2 新規作成ファイル

| ファイル | 内容 |
|---------|------|
| `lib/supabase/client.ts` | ブラウザ用Supabase Client |
| `lib/supabase/server.ts` | サーバー用Supabase Client |
| `lib/supabase/middleware.ts` | Middleware用Supabase Client |
| `lib/supabase/admin.ts` | サービスロール用Supabase Client（usage tracking等） |
| `app/auth/callback/route.ts` | OAuthコールバックハンドラ |
| `types/supabase.ts` | Supabase用型定義（DB型） |

### 3.3 更新するファイル（全量）

**認証関連**

| ファイル | 変更内容 |
|---------|---------|
| `middleware.ts` | Supabase認証チェックに変更 |
| `lib/api/auth.ts` | Supabase認証に変更 |
| `app/auth/signin/page.tsx` | Supabaseサインインに変更 |

**主要機能**

| ファイル | 変更内容 |
|---------|---------|
| `app/api/chat/history/route.ts` | Prisma→Supabase |
| `app/api/chat/feature/route.ts` | Prisma→Supabase |
| `app/api/research/route.ts` | Prisma→Supabase（要確認） |
| `lib/prompts/db/crud.ts` | Prisma→Supabase |
| `lib/prompts/db/version.ts` | Prisma→Supabase（トランザクション対応） |
| `lib/prompts/db/versions.ts` | Prisma→Supabase |
| `lib/prompts/db/seed.ts` | Prisma→Supabase |
| `lib/prompts/system-prompt.ts` | Prisma→Supabase |
| `lib/usage/tracker.ts` | Prisma→Supabase（サービスロール使用） |
| `lib/settings/db.ts` | Prisma→Supabase（GrokToolSettings関連は削除） |

**管理機能**

| ファイル | 変更内容 |
|---------|---------|
| `app/api/admin/users/route.ts` | Prisma→Supabase |
| `app/api/admin/users/[id]/role/route.ts` | Prisma→Supabase |
| `app/api/admin/prompts/route.ts` | Prisma→Supabase |
| `app/api/admin/prompts/[key]/route.ts` | Prisma→Supabase |
| `app/api/admin/prompts/[key]/history/route.ts` | Prisma→Supabase |
| `app/api/admin/prompts/[key]/restore/route.ts` | Prisma→Supabase |
| `app/api/admin/usage/route.ts` | Prisma→Supabase（$queryRaw対応） |
| `app/api/admin/programs/route.ts` | Prisma→Supabase |

**その他API**

| ファイル | 変更内容 |
|---------|---------|
| `app/api/llm/usage/route.ts` | Prisma→Supabase |
| `app/api/prompts/route.ts` | Prisma→Supabase |
| `app/api/prompts/[key]/versions/route.ts` | Prisma→Supabase |

---

## 4. トラブルシューティング

### 4.1 よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| `auth.uid() is null` | RLSポリシーで認証情報が取得できない | JWT検証、Cookie設定を確認 |
| `409 Conflict` | 一意制約違反 | 重複データを確認、UPSERT使用 |
| `42501` | RLSポリシー拒否 | ポリシー定義を確認 |
| セッションが切れる | Cookie設定不備 | `sameSite`, `secure`設定確認 |
| CORSエラー | リダイレクトURI不一致 | Supabase設定のURL確認 |

### 4.2 デバッグ方法

```typescript
// Supabaseクエリのデバッグ
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)

if (error) {
  console.error('Supabase error:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  })
}
```

---

## 5. チェックリスト

### 移行前

- [x] Neon DBのバックアップ取得 → 未実施（移行時に実施）
- [x] 既存環境変数のバックアップ → `.env.local` 確認済
- [ ] 移行ブランチ作成 (`feature/supabase-migration`)
- [x] Supabaseプロジェクト確認 → プロジェクト作成済

### 実装進捗

- [x] ステップ0: 移行計画書をコードベース調査に基づき修正
  - テーブル漏れ修正（17モデル→スキーマ作成対象7テーブル、データ移行3テーブル特定）
  - 未使用テーブル除外（LocationSchedule, GrokToolSettings, AppLog）
  - RLSポリシー修正、ファイル一覧を実コードベースに更新
- [x] パッケージインストール: `@supabase/supabase-js`, `@supabase/ssr` 追加済
- [x] Supabase MCP設定: アクセストークン設定済（Claude Code再起動で有効化）
- [x] `.env.local` にSupabase環境変数追加済（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`）
- [x] ステップ1: SQLスキーマ作成・適用済 → `supabase/migrations/20260309000000_initial_schema.sql`（`supabase db push` で適用完了、全7テーブル確認済）※未使用3テーブル除外
- [x] ステップ2: Supabaseクライアント設定ファイル作成済（`lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `admin.ts`）
- [x] ステップ3: 認証システム移行完了（middleware.ts, auth/callback/route.ts, signin/page.tsx, lib/api/auth.ts）
- [x] ステップ4: DB操作コード移行 - libレイヤー完了（prompts/db/crud,version,versions,seed,types, usage/tracker, settings/db, prompts/system-prompt）
- [x] ステップ5: DB操作コード移行 - APIルート完了（chat/history, chat/feature, admin/users, admin/users/[id]/role, admin/prompts, admin/usage, prompts, prompts/[key]/versions, llm/usage, admin/prompts/[key], admin/prompts/[key]/restore, admin/prompts/[key]/history, admin/prompts/[key]/history/[version], prompts/[key]/rollback）
- [x] ステップ6: 型チェックエラー修正完了（snake_case対応: scripts/apply-prompt-change, scripts/check-general-chat）
- [ ] ステップ7: `npm run build` による最終ビルド検証
- [ ] ステップ8: 不要ファイル削除 & パッケージ整理（lib/prisma.ts, lib/auth-options.ts, app/api/auth/[...nextauth] 等）※ステップ7とデータ移行完了後に実施

### 移行後

- [ ] 本番デプロイ
- [ ] 動作確認（認証・データアクセス）
- [ ] 全ユーザーにデータが正しく移行されたことを確認
- [ ] Neon DB削除（**移行完了確認後、1週間後**）
- [ ] ドキュメント更新
- [ ] 移行スクリプトをアーカイブ

### データ移行に関する重要事項

**タイミング**
- データ移行は**スキーマ移行後、認証移行前**が推奨
- 本番環境ではメンテナンスモードにして移行を実施

**リスク軽減**
- 必ず**バックアップ**を取得してから移行
- ユーザーIDマッピングファイルは必ず保存
- 移行後は複数ユーザーのデータアクセスを検証

**ロールバック**
- 移行失敗時はSupabase側をクリーンアップし、Neonを継続使用
- ユーザーIDマッピングファイルがあれば再移行可能

---

## 6. 参考リンク

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/)
- [NextAuth.js → Supabase Auth Migration](https://supabase.com/docs/guides/auth/migrating-to-supabase-auth)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-08 | 初版作成 |
| 2026-03-08 | 詳細化（スキーママッピング、コード例、ファイル一覧追加） |
| 2026-03-08 | **既存データ移行手順を追加**（Neon→Supabaseのデータ移行スクリプト、整合性検証手順） |
| 2026-03-08 | **コードベース調査に基づく全面修正**: テーブル漏れ修正（ProgramSettings, SystemSettings, SystemPromptVersion, FeaturePrompt追加）、未使用テーブル除外（LocationSchedule, GrokToolSettings, AppLog）、RLSポリシーの`auth.uid()`キャスト修正（UUID直比較）、`users.id`を`auth.users(id)`参照に変更、移行対象ファイル一覧を実コードベース32ファイルに更新、Prisma使用箇所の正確な記載 |
| 2026-03-08 | **実装開始**: `@supabase/supabase-js` + `@supabase/ssr` インストール済、Supabase MCPアクセストークン設定済、チェックリストを実装ステップに合わせて更新 |
| 2026-03-09 | **コード移行完了**: SQLスキーマ作成、lib/supabase/* 4ファイル作成、認証移行（middleware/callback/signin/auth）、libレイヤー移行（prompts/db 5ファイル + system-prompt + usage/tracker + settings/db）、APIルート移行（14ファイル）、全型チェックパス。残: 不要ファイル削除・ビルド検証・データ移行 |
| 2026-03-09 | **SQLスキーマ適用完了**: `supabase init` → `supabase link --project-ref tbzqswctewjgmhtswssq` → `supabase db push` で全7テーブル（未使用3テーブル除外）+ RLS + インデックスを本番適用。REST API で全テーブル存在確認済 |
| 2026-03-09 | **続き**: スキルスクリプト Supabase 移行（feature-cleanup delete-feature.mjs / audit-unused.mjs、db-query query.mjs）、NextAuth ルート削除、admin logs 機能削除、`lib/chat/chat-config.ts` を `@/lib/prompts/constants` 参照に変更（クライアントでサーバーコードを読まないよう修正）、テストを Supabase モック化（system-prompt.test.ts / db.test.ts）、`tsconfig.json` に `reference` 除外追加。**`npm run build` 成功**。プロンプト関連ユニットテスト 25 件パス（1 件 skip） |