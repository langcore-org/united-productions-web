/**
 * プロンプト統合エクスポート
 * 
 * DB管理のプロンプトをSingle Source of Truthとして使用
 * バージョン管理機能付き
 * 
 * 【統合履歴】
 * 2026-02-20: 個別プロンプトファイルを削除し、DB管理に一本化
 * - lib/prompts/general-chat.ts → 削除
 * - lib/prompts/minutes.ts → 削除
 * - lib/prompts/na-script.ts → 削除
 * - lib/prompts/proposal.ts → 削除
 * - lib/prompts/research-*.ts → 削除
 * - lib/prompts/transcript.ts → 削除
 * 
 * 後方互換性が必要な場合は getPromptWithFallback() を使用
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
  // デフォルトプロンプト（フォールバック用）
  DEFAULT_PROMPTS,
} from "./db";

export type { PromptVersionInfo, PromptWithVersions } from "./db";

// 後方互換性のためのエクスポート（transcript-format, meeting-formatは維持）
export { getTranscriptSystemPrompt, createUserPrompt } from "@/prompts/transcript-format";
export { getSystemPrompt, getTemplateList, getTemplateName } from "@/prompts/meeting-format";
export type { MeetingTemplate } from "@/prompts/meeting-format";
