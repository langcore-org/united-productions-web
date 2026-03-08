-- GrokToolSettingsテーブルの作成（機能別ツール有効化設定）
CREATE TABLE "GrokToolSettings" (
    "id"                  TEXT NOT NULL,
    "userId"              TEXT NOT NULL,
    "generalChat"         BOOLEAN NOT NULL DEFAULT false,
    "researchCast"        BOOLEAN NOT NULL DEFAULT false,
    "researchLocation"    BOOLEAN NOT NULL DEFAULT false,
    "researchInfo"        BOOLEAN NOT NULL DEFAULT true,
    "researchEvidence"    BOOLEAN NOT NULL DEFAULT true,
    "minutes"             BOOLEAN NOT NULL DEFAULT false,
    "proposal"            BOOLEAN NOT NULL DEFAULT false,
    "naScript"            BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrokToolSettings_pkey" PRIMARY KEY ("id")
);

-- ユニークインデックス（1ユーザー1設定）
CREATE UNIQUE INDEX "GrokToolSettings_userId_key" ON "GrokToolSettings"("userId");

-- 外部キー制約
ALTER TABLE "GrokToolSettings" ADD CONSTRAINT "GrokToolSettings_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
