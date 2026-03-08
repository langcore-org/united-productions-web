-- SystemPromptVersion テーブル作成
CREATE TABLE "SystemPromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changedBy" TEXT,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemPromptVersion_pkey" PRIMARY KEY ("id")
);

-- SystemPrompt にバージョン管理カラム追加
ALTER TABLE "SystemPrompt" ADD COLUMN IF NOT EXISTS "currentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SystemPrompt" ADD COLUMN IF NOT EXISTS "changedBy" TEXT;
ALTER TABLE "SystemPrompt" ADD COLUMN IF NOT EXISTS "changeNote" TEXT;

-- User に role カラム追加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';

-- インデックス作成
CREATE INDEX IF NOT EXISTS "SystemPromptVersion_promptId_version_idx" ON "SystemPromptVersion"("promptId", "version");
CREATE INDEX IF NOT EXISTS "SystemPromptVersion_promptId_createdAt_idx" ON "SystemPromptVersion"("promptId", "createdAt");

-- 外部キー制約
ALTER TABLE "SystemPromptVersion" ADD CONSTRAINT "SystemPromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "SystemPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 既存プロンプトのバージョン1レコードを作成
INSERT INTO "SystemPromptVersion" ("id", "promptId", "version", "content", "changeNote", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "id",
    1,
    "content",
    '初期シード',
    "createdAt"
FROM "SystemPrompt";
