/**
 * チャット機能の一元管理設定
 * 
 * すべてのチャット機能の設定をここで定義し、
 * 保守性と拡張性を確保する
 * 
 * プロンプトはDB管理（lib/prompts/db.ts）がSingle Source of Truth
 */

import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts/db";

// ============================================
// ツール設定
// ============================================

/** ツールオプション */
export interface ToolOptions {
  enableWebSearch?: boolean;
  enableXSearch?: boolean;
  enableCodeExecution?: boolean;
}

/** 機能別デフォルトツール設定 */
export const featureToolDefaults: Record<ChatFeatureId, ToolOptions> = {
  "general-chat": { enableWebSearch: true },
  "research-cast": { enableWebSearch: true, enableXSearch: true },
  "research-location": { enableWebSearch: true },
  "research-info": { enableWebSearch: true, enableXSearch: true },
  "research-evidence": { enableWebSearch: true },
  "minutes": { enableWebSearch: false },
  "proposal": { enableWebSearch: true, enableXSearch: true },
  "na-script": { enableWebSearch: false },
};

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
  promptKey: string; // DBプロンプトキー
  toolOptions: ToolOptions; // デフォルトツール設定
}

// デフォルトプロンプトをキーで検索するヘルパー
function getDefaultPromptContent(key: string): string {
  const prompt = DEFAULT_PROMPTS.find(p => p.key === key);
  return prompt?.content || "";
}

/** プロポーザル用システムプロンプトを生成（動的） */
function getProposalSystemPrompt(programInfo: string, pastProposals: string): string {
  const basePrompt = getDefaultPromptContent(PROMPT_KEYS.PROPOSAL);
  if (!programInfo && !pastProposals) {
    return basePrompt;
  }
  
  return `${basePrompt}

## 番組情報
${programInfo || "（未設定）"}

## 過去の企画案
${pastProposals || "（未設定）"}`;
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
    toolOptions: featureToolDefaults["general-chat"],
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
    toolOptions: featureToolDefaults["research-cast"],
  },
  "research-location": {
    featureId: "research-location",
    title: "場所リサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_LOCATION),
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    icon: "MapPin",
    description: "ロケ地候補と撮影条件を調査",
    promptKey: PROMPT_KEYS.RESEARCH_LOCATION,
    toolOptions: featureToolDefaults["research-location"],
  },
  "research-info": {
    featureId: "research-info",
    title: "情報リサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_INFO),
    placeholder: "リサーチしたいテーマを入力してください",
    outputFormat: "markdown",
    icon: "Info",
    description: "テーマに関する情報を収集・整理",
    promptKey: PROMPT_KEYS.RESEARCH_INFO,
    toolOptions: featureToolDefaults["research-info"],
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
    toolOptions: featureToolDefaults["research-evidence"],
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
    toolOptions: featureToolDefaults["minutes"],
  },
  proposal: {
    featureId: "proposal",
    title: "新企画立案",
    systemPrompt: getProposalSystemPrompt("", ""), // デフォルト値、動的に上書き可能
    placeholder: "企画の方向性・テーマ・条件を入力してください（例：感動系、20代向け、ロケ企画）",
    outputFormat: "markdown",
    icon: "Lightbulb",
    description: "番組情報を基に新企画を提案",
    promptKey: PROMPT_KEYS.PROPOSAL,
    toolOptions: featureToolDefaults["proposal"],
  },
  "na-script": {
    featureId: "na-script",
    title: "NA原稿作成",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.TRANSCRIPT),
    placeholder: "動画の文字起こしテキストを貼り付けてください。「整形して」や「NA原稿にして」など指示してください",
    inputLabel: "文字起こし入力",
    outputFormat: "plaintext",
    icon: "FileEdit",
    description: "文字起こし整形・NA原稿作成",
    promptKey: PROMPT_KEYS.TRANSCRIPT,
    toolOptions: featureToolDefaults["na-script"],
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

/** チャット設定のシステムプロンプトを更新（プロポーザル用） */
export function updateChatConfigSystemPrompt(
  config: ChatFeatureConfig,
  programInfo: string,
  pastProposals: string
): ChatFeatureConfig {
  if (config.featureId !== "proposal") return config;
  
  const basePrompt = getDefaultPromptContent(PROMPT_KEYS.PROPOSAL);
  const updatedPrompt = `${basePrompt}

## 番組情報
${programInfo || "（未設定）"}

## 過去の企画案
${pastProposals || "（未設定）"}`;
  
  return {
    ...config,
    systemPrompt: updatedPrompt,
  };
}
