/**
 * システム設定のDB層
 *
 * SystemSettingsテーブルを使ったKVストア。
 * 管理画面で変更された設定を永続化し、全ユーザーに適用する。
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import { isValidProvider } from '@/lib/llm/factory';
import { logger } from '@/lib/logger';
import type { LLMProvider } from '@/lib/llm/types';
import type { ChatFeatureId } from '@/lib/chat/chat-config';
import { CACHE_TTL_MS } from '@/config/constants';

/**
 * 管理可能なシステム設定キーの定数
 * 設定キーをここに追加するだけで管理対象に加えられる
 */
export const SYSTEM_SETTING_KEYS = {
  DEFAULT_LLM_PROVIDER: 'llm.defaultProvider',
  GROK_TOOL_SETTINGS: 'grok.toolSettings',
} as const;

// ============================================
// インメモリキャッシュ
// ============================================

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * キャッシュから値を取得
 */
function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // TTLチェック
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * キャッシュに値を設定
 */
function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * キャッシュを削除
 */
function clearCache(key: string): void {
  cache.delete(key);
}

export type SystemSettingKey = typeof SYSTEM_SETTING_KEYS[keyof typeof SYSTEM_SETTING_KEYS];

/**
 * システム設定を取得
 */
export async function getSystemSetting(key: SystemSettingKey): Promise<string | null> {
  try {
    const setting = await prisma.systemSettings.findUnique({ where: { key } });
    return setting?.value ?? null;
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
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * システム設定を削除（デフォルト値にリセット）
 */
export async function deleteSystemSetting(key: SystemSettingKey): Promise<void> {
  await prisma.systemSettings.deleteMany({ where: { key } });
}

/**
 * デフォルトLLMプロバイダーを取得
 * DB設定が存在し有効な値なら使用。なければコード上のDEFAULT_PROVIDERにフォールバック。
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

/**
 * ツールタイプ（正規名）
 *
 * - web_search: Web検索
 * - x_search: X検索
 * - code_execution: コード実行
 * - collections_search: ファイル検索
 */
export type GrokToolType = 'web_search' | 'x_search' | 'code_execution' | 'collections_search';

/** すべてのツールタイプ一覧 */
export const ALL_TOOL_TYPES: GrokToolType[] = [
  'web_search', 'x_search', 'code_execution', 'collections_search',
];

/**
 * レスポンス用ツールタイプ（エイリアス含む）
 * code_interpreter → code_execution, file_search → collections_search
 */
export type GrokToolTypeWithAlias = GrokToolType | 'code_interpreter' | 'file_search';

/** エイリアスを正規名に変換 */
export function normalizeToolType(toolType: GrokToolTypeWithAlias): GrokToolType {
  if (toolType === 'code_interpreter') return 'code_execution';
  if (toolType === 'file_search') return 'collections_search';
  return toolType;
}

/**
 * Grokツール設定の型（ネスト構造）
 *
 * 各機能（ChatFeatureId）に対して、有効なツールタイプの配列を持つ。
 * 例: { 'general-chat': ['web_search', 'x_search'], 'minutes': [] }
 */
export type GrokToolSettings = Record<ChatFeatureId, GrokToolType[]>;

/**
 * デフォルトのGrokツール設定
 * すべての機能で全ツールを有効化
 */
export const DEFAULT_GROK_TOOL_SETTINGS: GrokToolSettings = {
  'general-chat': [...ALL_TOOL_TYPES],
  'research-cast': [...ALL_TOOL_TYPES],
  'research-location': [...ALL_TOOL_TYPES],
  'research-info': [...ALL_TOOL_TYPES],
  'research-evidence': [...ALL_TOOL_TYPES],
  'minutes': [...ALL_TOOL_TYPES],
  'proposal': [...ALL_TOOL_TYPES],
  'na-script': [...ALL_TOOL_TYPES],
};

/**
 * 設定内で特定の機能×ツールが有効かチェック
 */
export function isToolEnabledInSettings(
  settings: GrokToolSettings,
  featureId: ChatFeatureId,
  toolType: GrokToolTypeWithAlias,
): boolean {
  const tools = settings[featureId];
  if (!tools) return false;
  return tools.includes(normalizeToolType(toolType));
}

/**
 * 設定内で特定の機能にツールが1つでも有効かチェック
 */
export function hasAnyToolEnabled(
  settings: GrokToolSettings,
  featureId: ChatFeatureId,
): boolean {
  const tools = settings[featureId];
  return Array.isArray(tools) && tools.length > 0;
}

/**
 * 特定の機能で特定のツールが有効かどうか
 *
 * 【変更】2026-02-20: DBからの設定取得を廃止し、常に全ツール有効を返す
 * 全機能ですべてのツール（Web検索、X検索、コード実行、ファイル検索）を使用可能
 */
export async function isToolEnabled(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _featureId: ChatFeatureId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _toolType: GrokToolTypeWithAlias
): Promise<boolean> {
  // 常に全ツール有効
  return true;
}

/** 部分設定をデフォルトとマージ */
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
 */
export async function getGrokToolSettings(userId: string): Promise<GrokToolSettings> {
  try {
    const record = await prisma.grokToolSettings.findUnique({
      where: { userId },
    });

    if (record?.settings) {
      return mergeWithDefaults(record.settings as Partial<GrokToolSettings>);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to get Grok tool settings', { error: err.message });
  }

  return DEFAULT_GROK_TOOL_SETTINGS;
}

/**
 * ユーザーのGrokツール設定を保存
 */
export async function saveGrokToolSettings(
  userId: string,
  settings: Partial<GrokToolSettings>
): Promise<GrokToolSettings> {
  const data = mergeWithDefaults(settings);

  await prisma.grokToolSettings.upsert({
    where: { userId },
    update: { settings: data as Prisma.InputJsonValue },
    create: {
      userId,
      settings: data as Prisma.InputJsonValue,
    },
  });

  return data;
}

/**
 * 特定の機能でGrokツールが有効かどうか
 *
 * 【変更】2026-02-20: DBからの設定取得を廃止し、常に有効を返す
 * 全機能ですべてのツールを使用可能
 */
export async function isGrokToolEnabled(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _featureId: ChatFeatureId
): Promise<boolean> {
  // 常に全ツール有効
  return true;
}

// ============================================
// システム全体のGrokツール設定（管理画面用）
// ============================================

/**
 * システム全体のGrokツール設定を取得（キャッシュ付き）
 * DBに設定がなければnullを返す
 */
export async function getSystemGrokToolSettings(): Promise<GrokToolSettings | null> {
  const cacheKey = SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS;

  // キャッシュチェック
  const cached = getCache<GrokToolSettings>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const value = await getSystemSetting(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS);
    if (value) {
      const parsed = JSON.parse(value) as Partial<GrokToolSettings>;
      const settings = mergeWithDefaults(parsed);
      // キャッシュに保存
      setCache(cacheKey, settings);
      return settings;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to get system Grok tool settings', { error: err.message, stack: err.stack });
    throw err;
  }

  return null;
}

/**
 * システム全体のGrokツール設定を取得（設定がない場合はデフォルト値を返す）
 * クライアント側で使用
 */
export async function getSystemGrokToolSettingsOrDefault(): Promise<GrokToolSettings> {
  const settings = await getSystemGrokToolSettings();
  return settings ?? DEFAULT_GROK_TOOL_SETTINGS;
}

/**
 * システム全体のGrokツール設定を保存
 * 保存後にキャッシュをクリア
 */
export async function setSystemGrokToolSettings(
  settings: Partial<GrokToolSettings>
): Promise<GrokToolSettings> {
  const data = mergeWithDefaults(settings);

  await setSystemSetting(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS, JSON.stringify(data));

  // キャッシュをクリア（次回取得時に新しい値をDBから取得）
  clearCache(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS);

  return data;
}
