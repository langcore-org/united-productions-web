-- ============================================
-- テーブル名変更とクリーンアップ
-- research_chats → chats
-- research_messages → chat_messages
-- 未使用テーブル削除
-- ============================================

-- 1. 外部キー制約のあるテーブルから順に削除
DROP TABLE IF EXISTS research_messages;
DROP TABLE IF EXISTS research_chats;

-- 2. 未使用テーブルも削除
DROP TABLE IF EXISTS transcripts;
DROP TABLE IF EXISTS program_settings;
DROP TABLE IF EXISTS system_settings;

-- 3. 新テーブル作成（chats, chat_messages）
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

-- 4. インデックス作成
CREATE INDEX idx_chats_user_agent_created ON chats(user_id, agent_type, created_at);
CREATE INDEX idx_chats_user_created ON chats(user_id, created_at);
CREATE INDEX idx_chats_agent_type ON chats(agent_type);
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);

-- 5. RLS有効化とポリシー設定
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own chats" ON chats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD messages in own chats" ON chat_messages
  FOR ALL USING (
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );
