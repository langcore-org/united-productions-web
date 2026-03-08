# Supabase 全面移行計画書（詳細版）

> **作成日**: 2026-03-08  
> **更新日**: 2026-03-08  
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
| 2 | 認証システム移行 | 12-16時間 | 🔴 高 |
| 3 | DB操作コード移行 | 40-60時間 | 🔴 高 |
| 4 | 環境変数・設定更新 | 2-4時間 | 🟢 低 |
| 5 | テスト・検証 | 12-16時間 | 🟡 中 |
| **合計** | | **70-104時間（約1.5-2週間）** | |

> **備考**: Google Drive連携はPhase 2として将来対応（追加工数: 8-12時間）

---

## 2. 移行ステップ詳細

### ステップ1: データベーススキーマ移行（4-8時間）

#### 1.1 現在のスキーマ確認

**対象ファイル**: `prisma/schema.prisma`

**主要モデル一覧**:

| モデル名 | 用途 | レコード数（推定） |
|---------|------|------------------|
| `User` | ユーザー情報 | 少 |
| `Account` | NextAuth OAuthアカウント | 少 |
| `Session` | NextAuthセッション | 中 |
| `MeetingNote` | 議事録データ | 中 |
| `Transcript` | NA原稿データ | 中 |
| `ResearchChat` | リサーチチャット | 多 |
| `ResearchMessage` | チャットメッセージ | 多（最多） |
| `UsageLog` | LLM使用ログ | 多 |
| `SystemPrompt` | システムプロンプト | 少 |

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

-- LogLevel Enum
CREATE TYPE log_level AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT');

-- LogCategory Enum
CREATE TYPE log_category AS ENUM ('AUTH', 'API', 'DB', 'SYSTEM', 'USER_ACTION', 'SECURITY', 'PERFORMANCE');

-- ============================================
-- 2. テーブル作成（Prisma → Supabase）
-- ============================================

-- Usersテーブル（NextAuthのuserテーブルに相当）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('MEETING', 'INTERVIEW')),
  raw_text TEXT NOT NULL,
  formatted_text TEXT,
  llm_provider llm_provider DEFAULT 'GEMINI_25_FLASH_LITE',
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FORMATTING', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcriptsテーブル
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  formatted_text TEXT,
  llm_provider llm_provider DEFAULT 'GEMINI_25_FLASH_LITE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ResearchChatsテーブル
CREATE TABLE research_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  title TEXT,
  llm_provider llm_provider DEFAULT 'GROK_4_1_FAST_REASONING',
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ResearchMessagesテーブル
CREATE TABLE research_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES research_chats(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================
-- 3. インデックス作成
-- ============================================

CREATE INDEX idx_meeting_notes_user_status_created ON meeting_notes(user_id, status, created_at);
CREATE INDEX idx_meeting_notes_user_created ON meeting_notes(user_id, created_at);
CREATE INDEX idx_transcripts_user_created ON transcripts(user_id, created_at);
CREATE INDEX idx_research_chats_user_agent_created ON research_chats(user_id, agent_type, created_at);
CREATE INDEX idx_research_chats_user_created ON research_chats(user_id, created_at);
CREATE INDEX idx_research_messages_chat_created ON research_messages(chat_id, created_at);
CREATE INDEX idx_usage_logs_user_provider_created ON usage_logs(user_id, provider, created_at);
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_logs_provider_created ON usage_logs(provider, created_at);
CREATE INDEX idx_system_prompts_category ON system_prompts(category);
CREATE INDEX idx_system_prompts_is_active ON system_prompts(is_active);
```

#### 1.3 RLSポリシー設定

```sql
-- ============================================
-- 4. Row Level Security (RLS) 設定
-- ============================================

-- Usersテーブル
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- MeetingNotesテーブル
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own meeting notes" ON meeting_notes
  FOR ALL USING (auth.uid()::text = user_id);

-- Transcriptsテーブル
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own transcripts" ON transcripts
  FOR ALL USING (auth.uid()::text = user_id);

-- ResearchChatsテーブル
ALTER TABLE research_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own research chats" ON research_chats
  FOR ALL USING (auth.uid()::text = user_id);

-- ResearchMessagesテーブル
ALTER TABLE research_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD messages in own chats" ON research_messages
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM research_chats WHERE user_id::text = auth.uid()::text
    )
  );

-- UsageLogsテーブル
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid()::text = user_id);

-- SystemPromptsテーブル（管理者のみ更新、全員閲覧）
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prompts" ON system_prompts
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Only admins can modify prompts" ON system_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND role = 'ADMIN'
    )
  );
```

#### 1.4 データ移行手順

```bash
# Step 1: 現在のNeon DBからデータをエクスポート
pg_dump --data-only --no-owner --no-acl \
  "$DATABASE_URL" > data_migration.sql

# Step 2: Supabaseにデータをインポート前に制約を無効化（必要に応じて）
# Supabase SQL Editorで実行:
-- SET session_replication_role = 'replica';

# Step 3: データインポート
psql "$SUPABASE_DATABASE_URL" < data_migration.sql

# Step 4: シーケンスのリセット（ID列の自動採番を調整）
-- Supabase SQL Editorで実行:
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
```

#### 1.5 スキーマ適用チェックリスト

- [ ] Supabase DashboardでSQL Editorを開く
- [ ] Enum型を作成
- [ ] テーブルを作成
- [ ] インデックスを作成
- [ ] RLSを有効化
- [ ] RLSポリシーを設定
- [ ] データを移行（必要に応じて）
- [ ] テストデータで動作確認

---

### ステップ2: 認証システム移行（12-16時間）

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

### ステップ3: DB操作コード移行（40-60時間）

#### 3.1 移行対象ファイル一覧

**優先度: 🔴 高（認証関連）**

| ファイル | 内容 | Prisma使用箇所 | 推定工数 |
|---------|------|---------------|---------|
| `lib/prisma.ts` | Prisma Client設定 | 全行 | 2h |
| `lib/api/auth.ts` | API認証ヘルパー | `getServerSession` | 完了（ステップ2） |
| `lib/auth-options.ts` | NextAuth設定 | `PrismaAdapter` | 削除 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth Route | `NextAuth` | 削除 |

**優先度: 🔴 高（主要機能）**

| ファイル | 内容 | Prisma使用箇所 | 推定工数 |
|---------|------|---------------|---------|
| `app/api/chat/history/route.ts` | チャット履歴 | `prisma.researchChat` | 2h |
| `app/api/research/route.ts` | リサーチAPI | `prisma.researchChat`, `prisma.researchMessage` | 3h |
| `app/api/meeting-notes/route.ts` | 議事録API | なし（既存実装確認） | 0.5h |
| `app/api/transcripts/route.ts` | NA原稿API | なし（既存実装確認） | 0.5h |
| `lib/prompts/db/*.ts` | プロンプトDB操作 | `prisma.systemPrompt`等 | 4h |

**優先度: 🟡 中（管理機能）**

| ファイル | 内容 | Prisma使用箇所 | 推定工数 |
|---------|------|---------------|---------|
| `app/api/admin/users/route.ts` | ユーザー管理 | `prisma.user` | 2h |
| `app/api/admin/prompts/*.ts` | プロンプト管理 | `prisma.systemPrompt`等 | 4h |
| `app/api/admin/logs/route.ts` | ログ管理 | `prisma.appLog` | 2h |
| `app/api/admin/usage/route.ts` | 使用状況 | `prisma.usageLog` | 2h |

**優先度: 🟢 低（その他）**

| ファイル | 内容 | Prisma使用箇所 | 推定工数 |
|---------|------|---------------|---------|
| `app/api/drive/*.ts` | Drive API | なし | 0h（将来対応） |
| `app/api/export/*.ts` | エクスポート | 要確認 | 1h |
| `app/api/upload/route.ts` | アップロード | 要確認 | 1h |
| `lib/settings/db.ts` | 設定DB | `prisma.programSettings`等 | 2h |
| `lib/usage/tracker.ts` | 使用追跡 | `prisma.usageLog` | 2h |

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
  .from('research_chats')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })

if (chatsError) throw chatsError

// メッセージカウントと最新メッセージを別途取得
const chatIds = chats.map(c => c.id)
const { data: messages, error: msgError } = await supabase
  .from('research_messages')
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
  .from('research_chats')
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
  .from('research_chats')
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
  .from('research_chats')
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
  .from('research_chats')
  .insert({ ... })
  .select()
  .single()

if (chatError) throw chatError

const { error: msgError } = await supabase
  .from('research_messages')
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
      .from('research_chats')
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
      .from('research_messages')
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
      .from('research_chats')
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

### ステップ4: 環境変数・設定更新（2-4時間）

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

### ステップ5: テスト・検証（12-16時間）

#### 5.1 テスト項目チェックリスト

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

#### 5.2 E2Eテスト更新

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

## 3. ファイル別移行マッピング

### 3.1 削除するファイル

| ファイル | 理由 |
|---------|------|
| `lib/auth-options.ts` | NextAuth設定不要 |
| `lib/prisma.ts` | Prisma Client不要 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth Route不要 |
| `prisma/schema.prisma` | Supabaseで管理 |
| `prisma/migrations/` | Supabaseで管理 |

### 3.2 新規作成ファイル

| ファイル | 内容 |
|---------|------|
| `lib/supabase/client.ts` | ブラウザ用Supabase Client |
| `lib/supabase/server.ts` | サーバー用Supabase Client |
| `lib/supabase/middleware.ts` | Middleware用Supabase Client |
| `app/auth/callback/route.ts` | OAuthコールバックハンドラ |
| `types/supabase.ts` | Supabase用型定義 |

### 3.3 更新するファイル（主要）

| ファイル | 変更内容 |
|---------|---------|
| `middleware.ts` | Supabase認証チェックに変更 |
| `lib/api/auth.ts` | Supabase認証に変更 |
| `app/auth/signin/page.tsx` | Supabaseサインインに変更 |
| `app/api/chat/history/route.ts` | Prisma→Supabase |
| `app/api/research/route.ts` | Prisma→Supabase |
| `lib/prompts/db/*.ts` | Prisma→Supabase |

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

- [ ] Neon DBのバックアップ取得
- [ ] 既存環境変数のバックアップ
- [ ] 移行ブランチ作成 (`feature/supabase-migration`)
- [ ] Supabaseプロジェクト確認

### 移行中

- [ ] ステップ1: スキーマ移行完了
- [ ] ステップ2: 認証システム移行完了
- [ ] ステップ3: DB操作コード移行完了
- [ ] ステップ4: 環境変数更新完了
- [ ] ステップ5: テスト完了

### 移行後

- [ ] 本番デプロイ
- [ ] 動作確認
- [ ] Neon DB削除（1週間後）
- [ ] ドキュメント更新

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
