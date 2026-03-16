/**
 * プロンプト基本CRUD操作（Supabase版）
 *
 * @created 2026-02-22 12:10
 * @updated 2026-03-09 Supabase移行
 */

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PROMPTS } from "../constants";
import type { SystemPrompt } from "./types";

/**
 * DBからプロンプトを取得
 */
export async function getPromptFromDB(key: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: prompt } = await supabase
      .from("system_prompts")
      .select("id, current_version")
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (!prompt) return null;

    const { data: version } = await supabase
      .from("system_prompt_versions")
      .select("content")
      .eq("prompt_id", prompt.id)
      .eq("version", prompt.current_version)
      .single();

    return version?.content ?? null;
  } catch (error) {
    console.error(`Failed to fetch prompt "${key}":`, error);
    return null;
  }
}

/**
 * 複数のプロンプトを一括取得
 */
export async function getPromptsFromDB(keys: string[]): Promise<Record<string, string | null>> {
  try {
    const supabase = await createClient();
    const { data: prompts, error } = await supabase
      .from("system_prompts")
      .select("id, key, current_version")
      .in("key", keys);

    if (error) throw error;
    if (!prompts?.length) return Object.fromEntries(keys.map((k) => [k, null]));

    const { data: versions } = await supabase
      .from("system_prompt_versions")
      .select("prompt_id, version, content")
      .in(
        "prompt_id",
        prompts.map((p) => p.id),
      );

    const result: Record<string, string | null> = {};
    for (const key of keys) {
      const prompt = prompts.find((p) => p.key === key);
      if (!prompt) {
        result[key] = null;
        continue;
      }
      const version = versions?.find(
        (v) => v.prompt_id === prompt.id && v.version === prompt.current_version,
      );
      result[key] = version?.content ?? null;
    }
    return result;
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return Object.fromEntries(keys.map((k) => [k, null]));
  }
}

/**
 * カテゴリ別にプロンプト一覧を取得
 */
export async function getPromptsByCategory(category: string): Promise<SystemPrompt[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_prompts")
      .select("*")
      .eq("category", category)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as SystemPrompt[]) || [];
  } catch (error) {
    console.error(`Failed to fetch prompts by category "${category}":`, error);
    return [];
  }
}

/**
 * 全プロンプトを取得
 */
export async function getAllPrompts(): Promise<SystemPrompt[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_prompts")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return (data as SystemPrompt[]) || [];
  } catch (error) {
    console.error("Failed to fetch all prompts:", error);
    return [];
  }
}

/**
 * フォールバック付きでプロンプトを取得
 */
export async function getPromptWithFallback(key: string, defaultValue: string): Promise<string> {
  const content = await getPromptFromDB(key);
  return content || defaultValue;
}

/**
 * デフォルトプロンプトを取得
 */
export function getDefaultPrompt(key: string): string | null {
  const prompt = DEFAULT_PROMPTS.find((p) => p.key === key);
  return prompt?.content || null;
}
