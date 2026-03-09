/**
 * システム設定のDB層（Supabase版）
 *
 * SystemSettingsテーブルを使ったKVストア。
 *
 * @updated 2026-03-09 Supabase移行
 */

import { CACHE_TTL_MS } from "@/config/constants";
import type { ChatFeatureId } from "@/lib/chat/chat-config";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import { isValidProvider } from "@/lib/llm/factory";
import type { LLMProvider } from "@/lib/llm/types";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 管理可能なシステム設定キーの定数
 */
export const SYSTEM_SETTING_KEYS = {
  DEFAULT_LLM_PROVIDER: "llm.defaultProvider",
  GROK_TOOL_SETTINGS: "grok.toolSettings",
} as const;

// ============================================
// インメモリキャッシュ
// ============================================

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(key: string): void {
  cache.delete(key);
}

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];

/**
 * システム設定を取得
 */
export async function getSystemSetting(key: SystemSettingKey): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return data?.value ?? null;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Failed to get system setting: ${key}`, { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * システム設定を保存（upsert）
 */
export async function setSystemSetting(key: SystemSettingKey, value: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw error;
}

/**
 * システム設定を削除（デフォルト値にリセット）
 */
export async function deleteSystemSetting(key: SystemSettingKey): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("system_settings").delete().eq("key", key);
  if (error) throw error;
}

/**
 * デフォルトLLMプロバイダーを取得
 */
export async function getDefaultLLMProvider(): Promise<LLMProvider> {
  const value = await getSystemSetting(SYSTEM_SETTING_KEYS.DEFAULT_LLM_PROVIDER);
  if (value && isValidProvider(value)) {
    return value;
  }
  return DEFAULT_PROVIDER;
}

// ============================================
// Grokツール設定
// ============================================

export type GrokToolType = "web_search" | "x_search" | "code_execution";
export const ALL_TOOL_TYPES: GrokToolType[] = ["web_search", "x_search", "code_execution"];
export type GrokToolTypeWithAlias = GrokToolType | "code_interpreter";

export function normalizeToolType(toolType: GrokToolTypeWithAlias): GrokToolType {
  if (toolType === "code_interpreter") return "code_execution";
  return toolType;
}

export type GrokToolSettings = Record<ChatFeatureId, GrokToolType[]>;

export const DEFAULT_GROK_TOOL_SETTINGS: GrokToolSettings = {
  "general-chat": [...ALL_TOOL_TYPES],
  "research-cast": [...ALL_TOOL_TYPES],
  "research-evidence": [...ALL_TOOL_TYPES],
  minutes: [...ALL_TOOL_TYPES],
  proposal: [...ALL_TOOL_TYPES],
};

export function isToolEnabledInSettings(
  settings: GrokToolSettings,
  featureId: ChatFeatureId,
  toolType: GrokToolTypeWithAlias,
): boolean {
  const tools = settings[featureId];
  if (!tools) return false;
  return tools.includes(normalizeToolType(toolType));
}

export function hasAnyToolEnabled(settings: GrokToolSettings, featureId: ChatFeatureId): boolean {
  const tools = settings[featureId];
  return Array.isArray(tools) && tools.length > 0;
}

export async function isToolEnabled(
  _featureId: ChatFeatureId,
  _toolType: GrokToolTypeWithAlias,
): Promise<boolean> {
  return true;
}

function mergeWithDefaults(partial: Partial<GrokToolSettings>): GrokToolSettings {
  const result = { ...DEFAULT_GROK_TOOL_SETTINGS };
  for (const key of Object.keys(result) as ChatFeatureId[]) {
    if (key in partial && Array.isArray(partial[key])) {
      result[key] = partial[key];
    }
  }
  return result;
}

/**
 * ユーザーのGrokツール設定を取得
 * GrokToolSettings は system_settings に統合（ユーザー別テーブルは廃止）
 */
export async function getGrokToolSettings(_userId: string): Promise<GrokToolSettings> {
  return DEFAULT_GROK_TOOL_SETTINGS;
}

/**
 * ユーザーのGrokツール設定を保存
 */
export async function saveGrokToolSettings(
  _userId: string,
  settings: Partial<GrokToolSettings>,
): Promise<GrokToolSettings> {
  return mergeWithDefaults(settings);
}

export async function isGrokToolEnabled(
  _userId: string,
  _featureId: ChatFeatureId,
): Promise<boolean> {
  return true;
}

// ============================================
// システム全体のGrokツール設定（管理画面用）
// ============================================

export async function getSystemGrokToolSettings(): Promise<GrokToolSettings | null> {
  const cacheKey = SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS;
  const cached = getCache<GrokToolSettings>(cacheKey);
  if (cached) return cached;

  try {
    const value = await getSystemSetting(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS);
    if (value) {
      const parsed = JSON.parse(value) as Partial<GrokToolSettings>;
      const settings = mergeWithDefaults(parsed);
      setCache(cacheKey, settings);
      return settings;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to get system Grok tool settings", {
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
  return null;
}

export async function getSystemGrokToolSettingsOrDefault(): Promise<GrokToolSettings> {
  const settings = await getSystemGrokToolSettings();
  return settings ?? DEFAULT_GROK_TOOL_SETTINGS;
}

export async function setSystemGrokToolSettings(
  settings: Partial<GrokToolSettings>,
): Promise<GrokToolSettings> {
  const data = mergeWithDefaults(settings);
  await setSystemSetting(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS, JSON.stringify(data));
  clearCache(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS);
  return data;
}
