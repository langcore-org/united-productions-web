-- FeaturePromptテーブルを追加
CREATE TABLE "FeaturePrompt" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturePrompt_pkey" PRIMARY KEY ("id")
);

-- インデックス作成
CREATE UNIQUE INDEX "FeaturePrompt_featureId_key" ON "FeaturePrompt"("featureId");
CREATE INDEX "FeaturePrompt_featureId_idx" ON "FeaturePrompt"("featureId");
CREATE INDEX "FeaturePrompt_promptKey_idx" ON "FeaturePrompt"("promptKey");
CREATE INDEX "FeaturePrompt_isActive_idx" ON "FeaturePrompt"("isActive");
