/**
 * プロンプトバージョン管理（Supabase版）
 *
 * @created 2026-02-22 12:10
 * @updated 2026-03-09 Supabase移行
 */

import { createClient } from "@/lib/supabase/server";
import type { PromptWithVersions, SystemPrompt, SystemPromptVersion } from "./types";

/**
 * プロンプトを更新（バージョン自動採番）
 */
export async function updatePromptWithVersion(
  key: string,
  content: string,
  changedBy?: string,
  changeNote?: string,
): Promise<SystemPrompt> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("system_prompts")
    .select("*")
    .eq("key", key)
    .single();

  if (fetchError || !current) {
    throw new Error(`Prompt not found: ${key}`);
  }

  const newVersion = current.current_version + 1;

  const { error: versionError } = await supabase.from("system_prompt_versions").insert({
    prompt_id: current.id,
    version: newVersion,
    content,
    changed_by: changedBy || null,
    change_note: changeNote || null,
  });

  if (versionError) throw versionError;

  const { data: updated, error: updateError } = await supabase
    .from("system_prompts")
    .update({
      current_version: newVersion,
      changed_by: changedBy || null,
      change_note: changeNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key)
    .select()
    .single();

  if (updateError || !updated) throw updateError || new Error("Update failed");
  return updated as SystemPrompt;
}

/**
 * プロンプトのバージョン履歴を取得
 */
export async function getPromptVersionHistory(key: string): Promise<SystemPromptVersion[]> {
  const supabase = await createClient();

  const { data: prompt, error: promptError } = await supabase
    .from("system_prompts")
    .select("id")
    .eq("key", key)
    .single();

  if (promptError || !prompt) {
    throw new Error(`Prompt not found: ${key}`);
  }

  const { data: versions, error } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false });

  if (error) throw error;
  return (versions as SystemPromptVersion[]) || [];
}

/**
 * 特定バージョンのプロンプト内容を取得
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

  if (!prompt) return null;

  const { data } = await supabase
    .from("system_prompt_versions")
    .select("*")
    .eq("prompt_id", prompt.id)
    .eq("version", version)
    .single();

  return (data as SystemPromptVersion) || null;
}

/**
 * 指定バージョンに復元（新バージョンとして記録）
 */
export async function restorePromptVersion(
  key: string,
  version: number,
  changedBy?: string,
  changeNote?: string,
): Promise<SystemPrompt> {
  const targetVersion = await getPromptVersion(key, version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found for prompt: ${key}`);
  }

  const restoreNote = changeNote
    ? `${changeNote}（バージョン${version}から復元）`
    : `バージョン${version}から復元`;

  return updatePromptWithVersion(key, targetVersion.content, changedBy, restoreNote);
}

/**
 * プロンプト詳細を取得（バージョン履歴付き）
 */
export async function getPromptWithHistory(key: string): Promise<PromptWithVersions | null> {
  const supabase = await createClient();

  const { data: prompt, error: promptError } = await supabase
    .from("system_prompts")
    .select("*")
    .eq("key", key)
    .single();

  if (promptError || !prompt) return null;

  const { data: versions } = await supabase
    .from("system_prompt_versions")
    .select("id, prompt_id, version, content, changed_by, change_note, created_at")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false });

  return {
    ...(prompt as SystemPrompt),
    versions: (versions as SystemPromptVersion[]) || [],
  };
}
