-- ============================================
-- Supabase 初期スキーマ（Neon/Prisma からの移行）
-- 実行: Supabase Dashboard SQL Editor で実行するか
--       supabase link 後に supabase db push
-- ============================================

-- 1. Enum型
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

-- 2. Users（auth.users と連携）
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

-- 3. アプリテーブル
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

-- Note: transcripts テーブルは現在未使用（Sidebarから削除済み）のため作成しない
-- 将来的に必要になった場合は manuscripts などの名前で作成を検討

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

-- Note: program_settings テーブルは現在未使用のため作成しない

-- Note: system_settings テーブルは現在未使用のため作成しない

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

CREATE TABLE feature_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT UNIQUE NOT NULL,
  prompt_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. インデックス
CREATE INDEX idx_meeting_notes_user_status_created ON meeting_notes(user_id, status, created_at);
CREATE INDEX idx_meeting_notes_user_created ON meeting_notes(user_id, created_at);

-- Note: transcripts テーブル未使用のためインデックスも作成しない

CREATE INDEX idx_chats_user_agent_created ON chats(user_id, agent_type, created_at);
CREATE INDEX idx_chats_user_created ON chats(user_id, created_at);
CREATE INDEX idx_chats_agent_type ON chats(agent_type);
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);
CREATE INDEX idx_usage_logs_user_provider_created ON usage_logs(user_id, provider, created_at);
CREATE INDEX idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_logs_provider_created ON usage_logs(provider, created_at);
CREATE INDEX idx_usage_logs_created_cost ON usage_logs(created_at, cost);

-- Note: program_settings テーブル未使用のためインデックスも作成しない

-- Note: system_settings テーブル未使用のためインデックスも作成しない

CREATE INDEX idx_system_prompts_category ON system_prompts(category);
CREATE INDEX idx_system_prompts_is_active ON system_prompts(is_active);
CREATE INDEX idx_system_prompt_versions_prompt_created ON system_prompt_versions(prompt_id, created_at);
CREATE INDEX idx_feature_prompts_feature_id ON feature_prompts(feature_id);
CREATE INDEX idx_feature_prompts_prompt_key ON feature_prompts(prompt_key);
CREATE INDEX idx_feature_prompts_is_active ON feature_prompts(is_active);

-- 5. RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own meeting notes" ON meeting_notes FOR ALL USING (auth.uid() = user_id);

-- Note: transcripts テーブル未使用のためRLSポリシー不要

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own chats" ON chats FOR ALL USING (auth.uid() = user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD messages in own chats" ON chat_messages
  FOR ALL USING (
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage logs" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert usage logs" ON usage_logs FOR INSERT WITH CHECK (true);

-- Note: program_settings, system_settings テーブル未使用のためRLSポリシー不要

ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active prompts" ON system_prompts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can view all prompts" ON system_prompts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "Only admins can modify prompts" ON system_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

ALTER TABLE system_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view prompt versions" ON system_prompt_versions FOR SELECT USING (true);
CREATE POLICY "Only admins can modify prompt versions" ON system_prompt_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

ALTER TABLE feature_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active feature prompts" ON feature_prompts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Only admins can modify feature prompts" ON feature_prompts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- public.users は Auth コールバック後または admin.createUser 時にアプリ側で upsert する。
