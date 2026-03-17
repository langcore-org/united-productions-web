/**
 * プロンプトキー定数
 *
 * @created 2026-02-22 12:35
 */

export const PROMPT_KEYS = {
  // Agentic Base
  AGENTIC_BASE: "AGENTIC_BASE",

  // General
  GENERAL_CHAT: "GENERAL_CHAT",

  // Minutes
  MINUTES: "MINUTES",
  MEETING_FORMAT_MEETING: "MEETING_FORMAT_MEETING",
  MEETING_FORMAT_INTERVIEW: "MEETING_FORMAT_INTERVIEW",

  // Transcript
  TRANSCRIPT: "TRANSCRIPT",
  TRANSCRIPT_FORMAT: "TRANSCRIPT_FORMAT",

  // Research
  RESEARCH_CAST: "RESEARCH_CAST",
  RESEARCH_INFO: "RESEARCH_INFO",
  RESEARCH_EVIDENCE: "RESEARCH_EVIDENCE",

  // Document
  PROPOSAL: "PROPOSAL",
} as const;

export type PromptKey = keyof typeof PROMPT_KEYS;

// カテゴリ定義
export const PROMPT_CATEGORIES = {
  general: "一般",
  minutes: "議事録",
  transcript: "起こし・NA",
  research: "リサーチ",
  document: "ドキュメント",
} as const;

export type PromptCategory = keyof typeof PROMPT_CATEGORIES;
