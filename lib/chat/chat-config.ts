/**
 * チャット機能の一元管理設定
 * 
 * すべてのチャット機能の設定をここで定義し、
 * 保守性と拡張性を確保する
 */

import { RESEARCH_CAST_SYSTEM_PROMPT } from "@/lib/prompts/research-cast";
import { RESEARCH_LOCATION_SYSTEM_PROMPT } from "@/lib/prompts/research-location";
import { RESEARCH_INFO_SYSTEM_PROMPT } from "@/lib/prompts/research-info";
import { RESEARCH_EVIDENCE_SYSTEM_PROMPT } from "@/lib/prompts/research-evidence";
import { MINUTES_SYSTEM_PROMPT } from "@/lib/prompts/minutes";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";
import { TRANSCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/transcript";
import { GENERAL_CHAT_SYSTEM_PROMPT } from "@/lib/prompts/general-chat";

/** チャット機能の識別子 */
export type ChatFeatureId =
  | "general-chat"
  | "research-cast"
  | "research-location"
  | "research-info"
  | "research-evidence"
  | "minutes"
  | "proposal"
  | "na-script";

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
}

/** 各機能の設定マップ */
export const chatFeatureConfigs: Record<ChatFeatureId, ChatFeatureConfig> = {
  "general-chat": {
    featureId: "general-chat",
    title: "チャット",
    systemPrompt: GENERAL_CHAT_SYSTEM_PROMPT,
    placeholder: "何か質問や相談があれば、お気軽にどうぞ",
    outputFormat: "markdown",
    icon: "MessageSquare",
    description: "一般的な質問や相談",
  },
  "research-cast": {
    featureId: "research-cast",
    title: "出演者リサーチ",
    systemPrompt: RESEARCH_CAST_SYSTEM_PROMPT,
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    icon: "Users",
    description: "企画に適した出演者候補を提案",
  },
  "research-location": {
    featureId: "research-location",
    title: "場所リサーチ",
    systemPrompt: RESEARCH_LOCATION_SYSTEM_PROMPT,
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    icon: "MapPin",
    description: "ロケ地候補と撮影条件を調査",
  },
  "research-info": {
    featureId: "research-info",
    title: "情報リサーチ",
    systemPrompt: RESEARCH_INFO_SYSTEM_PROMPT,
    placeholder: "リサーチしたいテーマを入力してください",
    outputFormat: "markdown",
    icon: "Info",
    description: "テーマに関する情報を収集・整理",
  },
  "research-evidence": {
    featureId: "research-evidence",
    title: "エビデンスリサーチ",
    systemPrompt: RESEARCH_EVIDENCE_SYSTEM_PROMPT,
    placeholder: "検証したい情報・主張を入力してください",
    outputFormat: "markdown",
    icon: "Shield",
    description: "情報の真偽を検証",
  },
  minutes: {
    featureId: "minutes",
    title: "議事録作成",
    systemPrompt: MINUTES_SYSTEM_PROMPT,
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし入力",
    outputFormat: "markdown",
    icon: "FileText",
    description: "文字起こしから議事録を作成",
  },
  proposal: {
    featureId: "proposal",
    title: "新企画立案",
    systemPrompt: getProposalSystemPrompt("", ""), // デフォルト値、動的に上書き可能
    placeholder: "企画の方向性・テーマ・条件を入力してください（例：感動系、20代向け、ロケ企画）",
    outputFormat: "markdown",
    icon: "Lightbulb",
    description: "番組情報を基に新企画を提案",
  },
  "na-script": {
    featureId: "na-script",
    title: "NA原稿作成",
    systemPrompt: TRANSCRIPT_SYSTEM_PROMPT,
    placeholder: "動画の文字起こしテキストを貼り付けてください。「整形して」や「NA原稿にして」など指示してください",
    inputLabel: "文字起こし入力",
    outputFormat: "plaintext",
    icon: "FileEdit",
    description: "文字起こし整形・NA原稿作成",
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
  return [
    chatFeatureConfigs["research-cast"],
    chatFeatureConfigs["research-location"],
    chatFeatureConfigs["research-info"],
    chatFeatureConfigs["research-evidence"],
  ];
}

/** 動的プロンプトが必要な機能かチェック */
export function requiresDynamicPrompt(featureId: ChatFeatureId): boolean {
  return featureId === "proposal";
}

/** 機能IDが有効かチェック */
export function isValidFeatureId(id: string): id is ChatFeatureId {
  return id in chatFeatureConfigs;
}
