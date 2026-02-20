/**
 * プロンプト統合エクスポート
 * 
 * DB管理のプロンプトを優先して使用
 * バージョン管理機能付き
 */

// DBプロンプト取得ユーティリティ
export {
  getPromptFromDB,
  getPromptsFromDB,
  getPromptsByCategory,
  getAllPrompts,
  getPromptWithFallback,
  updatePromptWithVersion,
  getPromptVersionHistory,
  getPromptVersion,
  restorePromptVersion,
  getPromptWithHistory,
  seedPrompts,
  PROMPT_KEYS,
  PROMPT_CATEGORIES,
} from "./db";

export type { PromptVersionInfo, PromptWithVersions } from "./db";

// 後方互換性のためのエクスポート（旧プロンプトファイル）
// これらは段階的に廃止予定
export { MINUTES_SYSTEM_PROMPT } from "./minutes";
export { TRANSCRIPT_SYSTEM_PROMPT } from "./transcript";
export { RESEARCH_CAST_SYSTEM_PROMPT } from "./research-cast";
export { RESEARCH_LOCATION_SYSTEM_PROMPT } from "./research-location";
export { RESEARCH_INFO_SYSTEM_PROMPT } from "./research-info";
export { RESEARCH_EVIDENCE_SYSTEM_PROMPT } from "./research-evidence";
export { getProposalSystemPrompt } from "./proposal";
export { GENERAL_CHAT_SYSTEM_PROMPT } from "./general-chat";

// 後方互換性のためのエクスポート
export { getTranscriptSystemPrompt, createUserPrompt } from "@/prompts/transcript-format";
export { getSystemPrompt, getTemplateList, getTemplateName } from "@/prompts/meeting-format";
export type { MeetingTemplate } from "@/prompts/meeting-format";
