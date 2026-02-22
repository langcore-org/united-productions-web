/**
 * Agents（専用チャット機能）の定義
 * 
 * 特定の用途に特化したチャット機能（AI Agent）を定義
 * プロンプトはDB管理（lib/prompts/db.ts）がSingle Source of Truth
 */

import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts/db";

/** Agentの識別子 */
export type AgentId =
  | "general"
  | "research-cast"
  | "research-location"
  | "research-info"
  | "research-evidence"
  | "minutes"
  | "proposal"
  | "na-script";

/** ツールオプション */
export interface ToolOptions {
  enableWebSearch?: boolean;
  enableXSearch?: boolean;
  enableCodeExecution?: boolean;
}

/** Agent（専用チャット機能）の定義 */
export interface Agent {
  id: AgentId;
  name: string;           // 表示名
  description: string;    // 説明
  icon: string;          // アイコン名
  systemPrompt: string;  // システムプロンプト
  placeholder: string;   // 入力欄のプレースホルダー
  inputLabel?: string;   // 入力欄のラベル（オプション）
  outputFormat: "markdown" | "plaintext";
  category: "research" | "document" | "general";
  color?: string;        // アクセントカラー
  promptKey: string;     // DBプロンプトキー
  toolOptions: ToolOptions; // デフォルトツール設定
}

// デフォルトプロンプトをキーで検索するヘルパー
function getDefaultPromptContent(key: string): string {
  const prompt = DEFAULT_PROMPTS.find(p => p.key === key);
  return prompt?.content || "";
}

/** 機能別デフォルトツール設定 */
const agentToolDefaults: Record<AgentId, ToolOptions> = {
  "general": { enableWebSearch: true },
  "research-cast": { enableWebSearch: true, enableXSearch: true },
  "research-location": { enableWebSearch: true },
  "research-info": { enableWebSearch: true, enableXSearch: true },
  "research-evidence": { enableWebSearch: true },
  "minutes": { enableWebSearch: false },
  "proposal": { enableWebSearch: true, enableXSearch: true },
  "na-script": { enableWebSearch: false },
};

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

/** 全てのAgent定義 */
export const AGENTS: Agent[] = [
  {
    id: "general",
    name: "一般チャット",
    description: "何でも相談できる汎用チャット",
    icon: "Sparkles",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.GENERAL_CHAT),
    placeholder: "何か質問や相談があれば、お気軽にどうぞ",
    outputFormat: "markdown",
    category: "general",
    color: "#6366f1",
    promptKey: PROMPT_KEYS.GENERAL_CHAT,
    toolOptions: agentToolDefaults["general"],
  },
  {
    id: "research-cast",
    name: "出演者リサーチ",
    description: "企画に最適な出演者候補をリサーチ",
    icon: "Users",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_CAST),
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#ec4899",
    promptKey: PROMPT_KEYS.RESEARCH_CAST,
    toolOptions: agentToolDefaults["research-cast"],
  },
  {
    id: "research-location",
    name: "場所リサーチ",
    description: "ロケ地候補と撮影条件を調査",
    icon: "MapPin",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_LOCATION),
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#22c55e",
    promptKey: PROMPT_KEYS.RESEARCH_LOCATION,
    toolOptions: agentToolDefaults["research-location"],
  },
  {
    id: "research-info",
    name: "情報リサーチ",
    description: "テーマに関する情報を収集・整理",
    icon: "Search",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_INFO),
    placeholder: "リサーチしたいテーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#3b82f6",
    promptKey: PROMPT_KEYS.RESEARCH_INFO,
    toolOptions: agentToolDefaults["research-info"],
  },
  {
    id: "research-evidence",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック",
    icon: "Shield",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.RESEARCH_EVIDENCE),
    placeholder: "検証したい情報・主張を入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#f59e0b",
    promptKey: PROMPT_KEYS.RESEARCH_EVIDENCE,
    toolOptions: agentToolDefaults["research-evidence"],
  },
  {
    id: "minutes",
    name: "議事録作成",
    description: "文字起こしから議事録を自動作成",
    icon: "FileText",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.MINUTES),
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし",
    outputFormat: "markdown",
    category: "document",
    color: "#8b5cf6",
    promptKey: PROMPT_KEYS.MINUTES,
    toolOptions: agentToolDefaults["minutes"],
  },
  {
    id: "proposal",
    name: "新企画立案",
    description: "番組情報を基に新しい企画案を提案",
    icon: "Lightbulb",
    systemPrompt: getProposalSystemPrompt("", ""),
    placeholder: "企画の方向性・テーマ・条件を入力してください",
    outputFormat: "markdown",
    category: "document",
    color: "#f97316",
    promptKey: PROMPT_KEYS.PROPOSAL,
    toolOptions: agentToolDefaults["proposal"],
  },
  {
    id: "na-script",
    name: "NA原稿作成",
    description: "文字起こしからナレーション原稿を作成",
    icon: "Mic",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.TRANSCRIPT),
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし",
    outputFormat: "plaintext",
    category: "document",
    color: "#14b8a6",
    promptKey: PROMPT_KEYS.TRANSCRIPT,
    toolOptions: agentToolDefaults["na-script"],
  },
];

/** AgentをIDで取得 */
export function getAgentById(id: AgentId): Agent {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) {
    throw new Error(`Unknown agent id: ${id}`);
  }
  return agent;
}

/** カテゴリ別のAgent一覧 */
export function getAgentsByCategory(category: Agent["category"]): Agent[] {
  return AGENTS.filter((a) => a.category === category);
}

/** リサーチ系のAgent */
export function getResearchAgents(): Agent[] {
  return getAgentsByCategory("research");
}

/** ドキュメント系のAgent */
export function getDocumentAgents(): Agent[] {
  return getAgentsByCategory("document");
}

/** 一般系のAgent */
export function getGeneralAgents(): Agent[] {
  return getAgentsByCategory("general");
}

/** プロポーザルのAgentかチェック（動的プロンプトが必要） */
export function isProposalAgent(agentId: AgentId): boolean {
  return agentId === "proposal";
}

/** プロポーザルのシステムプロンプトを更新（動的プログラム情報を反映） */
export function updateProposalSystemPrompt(agent: Agent, programInfo: string, pastProposals: string): Agent {
  if (agent.id !== "proposal") return agent;
  
  return {
    ...agent,
    systemPrompt: getProposalSystemPrompt(programInfo, pastProposals),
  };
}

// ============================================
// 後方互換性のためのエイリアス（移行期間中）
// ============================================

/** @deprecated Use AgentId instead */
export type GemId = AgentId;

/** @deprecated Use Agent instead */
export type Gem = Agent;

/** @deprecated Use AGENTS instead */
export const GEMS = AGENTS;

/** @deprecated Use getAgentById instead */
export const getGemById = getAgentById;

/** @deprecated Use getAgentsByCategory instead */
export const getGemsByCategory = getAgentsByCategory;

/** @deprecated Use getResearchAgents instead */
export const getResearchGems = getResearchAgents;

/** @deprecated Use getDocumentAgents instead */
export const getDocumentGems = getDocumentAgents;

/** @deprecated Use getGeneralAgents instead */
export const getGeneralGems = getGeneralAgents;

/** @deprecated Use isProposalAgent instead */
export const isProposalGem = isProposalAgent;
