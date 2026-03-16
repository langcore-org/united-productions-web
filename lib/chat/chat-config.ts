/**
 * チャット機能の一元管理設定
 *
 * すべてのチャット機能の設定をここで定義し、
 * 保守性と拡張性を確保する
 *
 * プロンプトはDB管理（lib/prompts/db.ts）がSingle Source of Truth
 */

import type { PromptSuggestion } from "@/components/chat/PromptSuggestions";
import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts/constants";

/** チャット機能の識別子 */
export type ChatFeatureId =
  | "general-chat"
  | "research-cast"
  | "research-evidence"
  | "minutes"
  | "proposal";

/** チャット機能の設定 */
export interface ChatFeatureConfig {
  featureId: ChatFeatureId;
  title: string;
  systemPrompt: string;
  placeholder: string;
  inputLabel?: string;
  outputFormat: "markdown" | "plaintext";
  icon?: string;
  description?: string;
  promptKey: string; // DBプロンプトキー
  promptSuggestions?: PromptSuggestion[]; // プロンプトサジェスト
}

// デフォルトプロンプトをキーで検索するヘルパー
function getDefaultPromptContent(key: string): string {
  const prompt = DEFAULT_PROMPTS.find((p) => p.key === key);
  return prompt?.content || "";
}

/** 各機能の設定マップ */
export const chatFeatureConfigs: Record<ChatFeatureId, ChatFeatureConfig> = {
  "general-chat": {
    featureId: "general-chat",
    title: "チャット",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.GENERAL_CHAT),
    placeholder: "何か質問や相談があれば、お気軽にどうぞ",
    outputFormat: "markdown",
    icon: "MessageSquare",
    description: "一般的な質問や相談",
    promptKey: PROMPT_KEYS.GENERAL_CHAT,
  },
  "research-cast": {
    featureId: "research-cast",
    title: "出演者リサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_CAST),
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    icon: "Users",
    description: "企画に適した出演者候補を提案",
    promptKey: PROMPT_KEYS.RESEARCH_CAST,
  },
  "research-evidence": {
    featureId: "research-evidence",
    title: "エビデンスリサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_EVIDENCE),
    placeholder: "検証したい情報・主張を入力してください",
    outputFormat: "markdown",
    icon: "Shield",
    description: "情報の真偽を検証",
    promptKey: PROMPT_KEYS.RESEARCH_EVIDENCE,
  },
  minutes: {
    featureId: "minutes",
    title: "議事録作成",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.MINUTES),
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし入力",
    outputFormat: "markdown",
    icon: "FileText",
    description: "文字起こしから議事録を作成",
    promptKey: PROMPT_KEYS.MINUTES,
  },
  proposal: {
    featureId: "proposal",
    title: "新企画立案",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.PROPOSAL),
    placeholder: "企画の方向性・テーマ・条件を入力してください（例：感動系、20代向け、ロケ企画）",
    outputFormat: "markdown",
    icon: "Lightbulb",
    description: "新コーナー・新企画を提案",
    promptKey: PROMPT_KEYS.PROPOSAL,
  },
};

/** 機能IDから設定を取得 */
export function getChatConfig(featureId: ChatFeatureId): ChatFeatureConfig {
  const config = chatFeatureConfigs[featureId];
  if (!config) {
    throw new Error(`Unknown featureId: ${featureId}`);
  }
  return config;
}

/** 全機能のリストを取得 */
export function getAllChatFeatures(): ChatFeatureConfig[] {
  return Object.values(chatFeatureConfigs);
}

/** リサーチ機能のリストを取得 */
export function getResearchFeatures(): ChatFeatureConfig[] {
  return [chatFeatureConfigs["research-cast"], chatFeatureConfigs["research-evidence"]];
}

/** 機能IDが有効かチェック */
export function isValidFeatureId(id: string): id is ChatFeatureId {
  return id in chatFeatureConfigs;
}
