-- FeaturePrompt 初期データ投入
-- 既存のSystemPromptと紐付け

INSERT INTO "FeaturePrompt" ("id", "featureId", "promptKey", "description", "isActive", "createdAt", "updatedAt") VALUES
('fp_general_chat', 'general-chat', 'GENERAL_CHAT', '一般チャット', true, NOW(), NOW()),
('fp_research_cast', 'research-cast', 'RESEARCH_CAST', '出演者リサーチ', true, NOW(), NOW()),
('fp_research_location', 'research-location', 'RESEARCH_LOCATION', '場所リサーチ', true, NOW(), NOW()),
('fp_research_info', 'research-info', 'RESEARCH_INFO', '情報リサーチ', true, NOW(), NOW()),
('fp_research_evidence', 'research-evidence', 'RESEARCH_EVIDENCE', 'エビデンスリサーチ', true, NOW(), NOW()),
('fp_minutes', 'minutes', 'MINUTES', '議事録作成', true, NOW(), NOW()),
('fp_proposal', 'proposal', 'PROPOSAL', '新企画立案', true, NOW(), NOW()),
('fp_na_script', 'na-script', 'TRANSCRIPT', 'NA原稿作成', true, NOW(), NOW());
