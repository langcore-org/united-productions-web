/**
 * チャット機能の一元管理設定
 * 
 * すべてのチャット機能の設定をここで定義し、
 * 保守性と拡張性を確保する
 * 
 * プロンプトはDB管理（lib/prompts/db.ts）がSingle Source of Truth
 */

import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts/db";
import { PromptSuggestion } from "@/components/chat/PromptSuggestions";

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
  promptSuggestions?: PromptSuggestion[]; // プロンプトサジェスト
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
    promptSuggestions: [
      { id: "1", text: "もっと詳しく教えて" },
      { id: "2", text: "具体例を挙げて" },
      { id: "3", text: "別の視点から考えて" },
    ],
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
    promptSuggestions: [
      { id: "1", text: "最も出演可能性が高い候補3名について、具体的なプレゼン企画書を作成してください" },
      { id: "2", text: "これらの候補者の中から、番組プロデューサーへの売り込み用のピッチ資料（スライド形式）を作ってください" },
      { id: "3", text: "過去の「マツコの知らない世界」で高視聴率を記録した回の傾向を分析して、成功パターンを表にまとめてください" },
      { id: "4", text: "実在する候補者を具体的にリサーチして、連絡先や実績とともにリスト化してください" },
    ],
  },
  "research-location": {
    featureId: "research-location",
    title: "場所リサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_LOCATION),
    placeholder: "ロケ地・撮影場所の条件を入力してください",
    outputFormat: "markdown",
    icon: "MapPin",
    description: "ロケ地候補と撮影条件を調査",
    promptKey: PROMPT_KEYS.RESEARCH_LOCATION,
    toolOptions: featureToolDefaults["research-location"],
    promptSuggestions: [
      { id: "1", text: "この場所の撮影許可取得方法を教えて" },
      { id: "2", text: "周辺の宿泊施設とアクセス情報をまとめて" },
      { id: "3", text: "類似のロケ地を他に提案して" },
    ],
  },
  "research-info": {
    featureId: "research-info",
    title: "情報リサーチ",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_INFO),
    placeholder: "リサーチしたいテーマを入力してください",
    outputFormat: "markdown",
    icon: "Search",
    description: "テーマに関する情報を収集・整理",
    promptKey: PROMPT_KEYS.RESEARCH_INFO,
    toolOptions: featureToolDefaults["research-info"],
    promptSuggestions: [
      { id: "1", text: "このトピックの最新ニュースを調べて" },
      { id: "2", text: "専門家用語を分かりやすく解説して" },
      { id: "3", text: "関連する統計データを探してまとめて" },
    ],
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
    promptSuggestions: [
      { id: "1", text: "この主張の信憑性をさらに深く検証してください" },
      { id: "2", text: "反対の意見や反論も調査して提示してください" },
      { id: "3", text: "専門家の見解や学術的な根拠を追加で調べて" },
    ],
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
    promptSuggestions: [
      { id: "1", text: "議事録をMarkdown形式で整形して" },
      { id: "2", text: "ToDoリストだけを抽出して" },
      { id: "3", text: "決定事項を箇条書きでまとめて" },
    ],
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
    promptSuggestions: [
      { id: "1", text: "この企画をより具体的に詳細化してください" },
      { id: "2", text: "予算とスケジュール案も追加してください" },
      { id: "3", text: "類似企画との差別化ポイントを強調してください" },
    ],
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
    promptSuggestions: [
      { id: "1", text: "読みやすく段落分けして整形してください" },
      { id: "2", text: "NA原稿形式（テロップ指示付き）に変換してください" },
      { id: "3", text: "重要なポイントだけを箇条書きで抽出してください" },
    ],
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
