/**
 * プロンプト基本CRUD操作
 * 
 * @created 2026-02-22 12:10
 */

import { prisma } from "@/lib/prisma";
import { SystemPrompt } from "@prisma/client";
import { DEFAULT_PROMPTS } from "../constants";

/**
 * DBからプロンプトを取得
 * @param key - プロンプトキー
 * @returns プロンプト内容（存在しない場合はnull）
 */
export async function getPromptFromDB(key: string): Promise<string | null> {
  try {
    const prompt = await prisma.systemPrompt.findUnique({
      where: { key },
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
 * @returns キーと内容のマップ
 */
export async function getPromptsFromDB(
  keys: string[]
): Promise<Record<string, string | null>> {
  try {
    const prompts = await prisma.systemPrompt.findMany({
      where: { key: { in: keys } },
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

/**
 * デフォルトプロンプトを取得
 * @param key - プロンプトキー
 * @returns デフォルトプロンプト内容
 */
export function getDefaultPrompt(key: string): string | null {
  const prompt = DEFAULT_PROMPTS.find((p) => p.key === key);
  return prompt?.content || null;
}
