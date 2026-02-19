/**
 * Gems（専用チャット機能）の定義
 * 
 * GeminiのGemと同様に、特定の用途に特化したチャット機能を定義
 */

import { RESEARCH_CAST_SYSTEM_PROMPT } from "@/lib/prompts/research-cast";
import { RESEARCH_LOCATION_SYSTEM_PROMPT } from "@/lib/prompts/research-location";
import { RESEARCH_INFO_SYSTEM_PROMPT } from "@/lib/prompts/research-info";
import { RESEARCH_EVIDENCE_SYSTEM_PROMPT } from "@/lib/prompts/research-evidence";
import { MINUTES_SYSTEM_PROMPT } from "@/lib/prompts/minutes";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";
import { TRANSCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/transcript";
import { GENERAL_CHAT_SYSTEM_PROMPT } from "@/lib/prompts/general-chat";

/** Gemの識別子 */
export type GemId =
  | "general"
  | "research-cast"
  | "research-location"
  | "research-info"
  | "research-evidence"
  | "minutes"
  | "proposal"
  | "na-script";

/** Gem（専用チャット機能）の定義 */
export interface Gem {
  id: GemId;
  name: string;           // 表示名
  description: string;    // 説明
  icon: string;          // アイコン名
  systemPrompt: string;  // システムプロンプト
  placeholder: string;   // 入力欄のプレースホルダー
  inputLabel?: string;   // 入力欄のラベル（オプション）
  outputFormat: "markdown" | "plaintext";
  category: "research" | "document" | "general";
  color?: string;        // アクセントカラー
}

/** 全てのGem定義 */
export const GEMS: Gem[] = [
  {
    id: "general",
    name: "一般チャット",
    description: "何でも相談できる汎用チャット",
    icon: "Sparkles",
    systemPrompt: GENERAL_CHAT_SYSTEM_PROMPT,
    placeholder: "何か質問や相談があれば、お気軽にどうぞ",
    outputFormat: "markdown",
    category: "general",
    color: "#6366f1",
  },
  {
    id: "research-cast",
    name: "出演者リサーチ",
    description: "企画に最適な出演者候補をリサーチ",
    icon: "Users",
    systemPrompt: RESEARCH_CAST_SYSTEM_PROMPT,
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#ec4899",
  },
  {
    id: "research-location",
    name: "場所リサーチ",
    description: "ロケ地候補と撮影条件を調査",
    icon: "MapPin",
    systemPrompt: RESEARCH_LOCATION_SYSTEM_PROMPT,
    placeholder: "企画内容・テーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#22c55e",
  },
  {
    id: "research-info",
    name: "情報リサーチ",
    description: "テーマに関する情報を収集・整理",
    icon: "Search",
    systemPrompt: RESEARCH_INFO_SYSTEM_PROMPT,
    placeholder: "リサーチしたいテーマを入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#3b82f6",
  },
  {
    id: "research-evidence",
    name: "エビデンスリサーチ",
    description: "情報の真偽を検証・ファクトチェック",
    icon: "Shield",
    systemPrompt: RESEARCH_EVIDENCE_SYSTEM_PROMPT,
    placeholder: "検証したい情報・主張を入力してください",
    outputFormat: "markdown",
    category: "research",
    color: "#f59e0b",
  },
  {
    id: "minutes",
    name: "議事録作成",
    description: "文字起こしから議事録を自動作成",
    icon: "FileText",
    systemPrompt: MINUTES_SYSTEM_PROMPT,
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし",
    outputFormat: "markdown",
    category: "document",
    color: "#8b5cf6",
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
  },
  {
    id: "na-script",
    name: "NA原稿作成",
    description: "文字起こしからナレーション原稿を作成",
    icon: "Mic",
    systemPrompt: TRANSCRIPT_SYSTEM_PROMPT,
    placeholder: "文字起こしテキストを貼り付けてください",
    inputLabel: "文字起こし",
    outputFormat: "plaintext",
    category: "document",
    color: "#14b8a6",
  },
];

/** GemをIDで取得 */
export function getGemById(id: GemId): Gem {
  const gem = GEMS.find((g) => g.id === id);
  if (!gem) {
    throw new Error(`Unknown gem id: ${id}`);
  }
  return gem;
}

/** カテゴリ別のGem一覧 */
export function getGemsByCategory(category: Gem["category"]): Gem[] {
  return GEMS.filter((g) => g.category === category);
}

/** リサーチ系のGem */
export function getResearchGems(): Gem[] {
  return getGemsByCategory("research");
}

/** ドキュメント系のGem */
export function getDocumentGems(): Gem[] {
  return getGemsByCategory("document");
}

/** 一般系のGem */
export function getGeneralGems(): Gem[] {
  return getGemsByCategory("general");
}

/** プロポーザルのGemかチェック（動的プロンプトが必要） */
export function isProposalGem(gemId: GemId): boolean {
  return gemId === "proposal";
}
