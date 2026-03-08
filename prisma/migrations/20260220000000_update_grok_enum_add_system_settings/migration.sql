-- Grok LLMProvider enum値のリネーム
ALTER TYPE "LLMProvider" RENAME VALUE 'GROK_41_FAST' TO 'GROK_4_1_FAST_REASONING';
ALTER TYPE "LLMProvider" RENAME VALUE 'GROK_4' TO 'GROK_4_0709';

-- SystemSettingsテーブルの作成（管理者が設定するグローバル設定のKVストア）
CREATE TABLE "SystemSettings" (
    "key"       TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("key")
);
