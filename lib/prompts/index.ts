/**
 * プロンプト統合エクスポート
 * 
 * 優先順位:
 * 1. DBに保存されたプロンプト（動的に変更可能）
 * 2. コード内のデフォルトプロンプト（フォールバック）
 */

// DBプロンプト取得ユーティリティ
export {
  getPromptFromDB,
  getPromptsFromDB,
  getPromptsByCategory,
  getAllPrompts,
  getPromptWithFallback,
  PROMPT_KEYS,
  PROMPT_CATEGORIES,
} from "./db";

// デフォルトプロンプト（フォールバック用）
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
