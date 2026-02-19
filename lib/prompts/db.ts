/**
 * DB管理プロンプト取得ユーティリティ
 * 
 * SystemPromptテーブルからプロンプトを取得する
 */

import { prisma } from "@/lib/prisma";
import { SystemPrompt } from "@prisma/client";

// カテゴリ別プロンプトキー
export const PROMPT_KEYS = {
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
  RESEARCH_LOCATION: "RESEARCH_LOCATION",
  RESEARCH_INFO: "RESEARCH_INFO",
  RESEARCH_EVIDENCE: "RESEARCH_EVIDENCE",
  
  // Document
  PROPOSAL: "PROPOSAL",
  
  // Schedule
  SCHEDULE_SYSTEM: "SCHEDULE_SYSTEM",
  SCHEDULE_ACTOR: "SCHEDULE_ACTOR",
  SCHEDULE_STAFF: "SCHEDULE_STAFF",
  SCHEDULE_VEHICLE: "SCHEDULE_VEHICLE",
} as const;

export type PromptKey = keyof typeof PROMPT_KEYS;

// カテゴリ定義
export const PROMPT_CATEGORIES = {
  general: "一般",
  minutes: "議事録",
  transcript: "起こし・NA",
  research: "リサーチ",
  document: "ドキュメント",
  schedule: "ロケスケ",
} as const;

export type PromptCategory = keyof typeof PROMPT_CATEGORIES;

/**
 * プロンプトをDBから取得
 * @param key - プロンプトキー
 * @returns プロンプト内容（見つからない場合はnull）
 */
export async function getPromptFromDB(key: string): Promise<string | null> {
  try {
    const prompt = await prisma.systemPrompt.findUnique({
      where: { key, isActive: true },
      select: { content: true },
    });
    return prompt?.content || null;
  } catch (error) {
    console.error(`Failed to fetch prompt "${key}":`, error);
    return null;
  }
}

/**
 * 複数のプロンプトを一括取得
 * @param keys - プロンプトキーの配列
 * @returns キーとプロンプト内容のマップ
 */
export async function getPromptsFromDB(keys: string[]): Promise<Record<string, string | null>> {
  try {
    const prompts = await prisma.systemPrompt.findMany({
      where: {
        key: { in: keys },
        isActive: true,
      },
      select: { key: true, content: true },
    });

    const result: Record<string, string | null> = {};
    for (const key of keys) {
      const prompt = prompts.find((p) => p.key === key);
      result[key] = prompt?.content || null;
    }
    return result;
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return Object.fromEntries(keys.map((k) => [k, null]));
  }
}

/**
 * カテゴリ別にプロンプト一覧を取得
 * @param category - カテゴリ名
 * @returns プロンプト一覧
 */
export async function getPromptsByCategory(category: string): Promise<SystemPrompt[]> {
  try {
    return await prisma.systemPrompt.findMany({
      where: { category, isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error(`Failed to fetch prompts by category "${category}":`, error);
    return [];
  }
}

/**
 * 全プロンプトを取得
 * @returns 全プロンプト一覧
 */
export async function getAllPrompts(): Promise<SystemPrompt[]> {
  try {
    return await prisma.systemPrompt.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    console.error("Failed to fetch all prompts:", error);
    return [];
  }
}

/**
 * フォールバック付きでプロンプトを取得
 * DBから取得できない場合はデフォルト値を返す
 * @param key - プロンプトキー
 * @param defaultValue - デフォルト値
 * @returns プロンプト内容
 */
export async function getPromptWithFallback(
  key: string,
  defaultValue: string
): Promise<string> {
  const content = await getPromptFromDB(key);
  return content || defaultValue;
}
