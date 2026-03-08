-- GrokToolSettings テーブルを再設計
-- 32個の平坦なbooleanフィールドから、JSON形式のネスト構造に変更
-- 新構造: settings JSONB = Record<ChatFeatureId, GrokToolType[]>

-- 既存の個別booleanカラムを削除し、settingsカラムを追加
ALTER TABLE "GrokToolSettings"
  DROP COLUMN IF EXISTS "generalChat",
  DROP COLUMN IF EXISTS "researchCast",
  DROP COLUMN IF EXISTS "researchLocation",
  DROP COLUMN IF EXISTS "researchInfo",
  DROP COLUMN IF EXISTS "researchEvidence",
  DROP COLUMN IF EXISTS "minutes",
  DROP COLUMN IF EXISTS "proposal",
  DROP COLUMN IF EXISTS "naScript",
  ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
