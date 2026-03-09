/**
 * プロンプトバージョン管理（Supabase版）
 *
 * @created 2026-02-24 18:05
 * @updated 2026-03-09 Supabase移行
 */

import { createClient } from "@/lib/supabase/server";
import type { SystemPromptVersion } from "./types";

/**
 * 最新のプロンプトを取得
 */
export async function getLatestPrompt(key: string): Promise<{
  content: string;
  version: number;
  id: string;
} | null> {
  const supabase = await createClient();

  const { data: prompt } = await supabase
    .from("system_prompts")
    .select("id")
    .eq("key", key)
    .single();

  if (!prompt) return null;

  const { data: latest } = await supabase
    .from("system_prompt_versions")
    .select("id, content, version")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return null;

  return {
    content: latest.content,
    version: latest.version,
    id: latest.id,
  };
}

/**
 * 新しいバージョンを作成
 */
export async function createPromptVersion(
  key: string,
  data: {
    content: string;
    changeNote?: string;
    changedBy?: string;
  },
): Promise<SystemPromptVersion> {
  const supabase = await createClient();

  const { data: prompt, error: promptError } = await supabase
    .from("system_prompts")
    .select("id, current_version")
    .eq("key", key)
    .single();

  if (promptError || !prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  const newVersion = prompt.current_version + 1;

  const { data: version, error: versionError } = await supabase
    .from("system_prompt_versions")
    .insert({
      prompt_id: prompt.id,
      version: newVersion,
      content: data.content,
      changed_by: data.changedBy,
      change_note: data.changeNote,
    })
    .select()
    .single();

  if (versionError || !version) throw versionError || new Error("Version creation failed");

  await supabase
    .from("system_prompts")
    .update({
      current_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prompt.id);

  return version as SystemPromptVersion;
}

/**
 * バージョン履歴を取得
 */
export async function getPromptVersions(
  key: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<
  Array<{
    version: number;
    change_note: string | null;
    changed_by: string | null;
    created_at: string;
  }>
> {
  const supabase = await createClient();

  const { data: prompt } = await supabase
    .from("system_prompts")
    .select("id")
    .eq("key", key)
    .single();

  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  let query = supabase
    .from("system_prompt_versions")
    .select("version, change_note, changed_by, created_at")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: versions, error } = await query;
  if (error) throw error;
  return versions || [];
}

/**
 * 特定のバージョンを取得
 */
export async function getPromptVersion(
  key: string,
  version: number,
): Promise<SystemPromptVersion | null> {
  const supabase = await createClient();

  const { data: prompt } = await supabase
    .from("system_prompts")
    .select("id")
    .eq("key", key)
    .single();

  if (!prompt) {
    throw new Error(`Prompt with key "${key}" not found`);
  }

  const { data } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("prompt_id", prompt.id)
    .eq("version", version)
    .single();

  return (data as SystemPromptVersion) || null;
}

/**
 * ロールバック（過去のバージョンを新しいバージョンとして複製）
 */
export async function rollbackPrompt(
  key: string,
  targetVersion: number,
  options?: {
    changeNote?: string;
    changedBy?: string;
  },
): Promise<SystemPromptVersion> {
  const target = await getPromptVersion(key, targetVersion);

  if (!target) {
    throw new Error(`Version ${targetVersion} not found for prompt "${key}"`);
  }

  return createPromptVersion(key, {
    content: target.content,
    changeNote: options?.changeNote || `ロールバック: バージョン${targetVersion}に戻す`,
    changedBy: options?.changedBy,
  });
}
