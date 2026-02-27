/**
 * Agents（専用チャット機能）の定義
 *
 * 特定の用途に特化したチャット機能（AI Agent）を定義
 * プロンプトはDB管理（lib/prompts/db.ts）がSingle Source of Truth
 */

import { DEFAULT_PROMPTS, PROMPT_KEYS } from "@/lib/prompts";

/** Agentの識別子 */
export type AgentId =
  | "general"
  | "research-cast"
  | "research-evidence"
  | "minutes"
  | "proposal"
  | "na-script";

/** Agent（専用チャット機能）の定義 */
export interface Agent {
  id: AgentId;
  name: string; // 表示名
  description: string; // 説明
  icon: string; // アイコン名
  systemPrompt: string; // システムプロンプト
  placeholder: string; // 入力欄のプレースホルダー
  inputLabel?: string; // 入力欄のラベル（オプション）
  outputFormat: "markdown" | "plaintext";
  category: "research" | "document" | "general";
  color?: string; // アクセントカラー
  promptKey: string; // DBプロンプトキー
  suggestions: string[]; // 新規チャット時のサジェスト例
}

// デフォルトプロンプトをキーで検索するヘルパー
function getDefaultPromptContent(key: string): string {
  const prompt = DEFAULT_PROMPTS.find((p) => p.key === key);
  return prompt?.content || "";
}

/** 全てのAgent定義 */
export const AGENTS: Agent[] = [
  {
    id: "general",
    name: "チャット",
    description: "何でも相談できる汎用チャット",
    icon: "Sparkles",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.GENERAL_CHAT),
    placeholder: "何か質問や相談があれば、お気軽にどうぞ",
    outputFormat: "markdown",
    category: "general",
    color: "#6366f1",
    promptKey: PROMPT_KEYS.GENERAL_CHAT,
    suggestions: [
      "今週の放送業界のトピックを教えて",
      "企画書の書き方のアドバイスをください",
      "この文章を校正してください",
    ],
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
    suggestions: [
      "バラエティ企画に合う若手俳優を探して",
      "料理の企画に詳しい出演者を教えて",
      "過去の出演履歴から候補を絞って",
    ],
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
    suggestions: [
      "この統計データの出典を確認して",
      "この噂は本当か調べて",
      "SNSで話題の情報をファクトチェックして",
    ],
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
    suggestions: [
      "Zoom文字起こしを議事録に整形して",
      "会議の決定事項を抽出して",
      "TODOリストを作成して",
    ],
  },
  {
    id: "proposal",
    name: "新企画立案",
    description: "新しい企画案を提案",
    icon: "Lightbulb",
    systemPrompt: getDefaultPromptContent(PROMPT_KEYS.PROPOSAL),
    placeholder: "企画の方向性・テーマ・条件を入力してください",
    outputFormat: "markdown",
    category: "document",
    color: "#f97316",
    promptKey: PROMPT_KEYS.PROPOSAL,
    suggestions: [
      "若年層向けの新しい企画を考えて",
      "季節に合った特番企画を提案して",
      "低予算で実現できる企画を考えて",
    ],
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
    suggestions: [
      "Premiere Pro書き起こしをNA原稿にして",
      "話者を判定して整形して",
      "フィラーを除去して原稿にして",
    ],
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
