/**
 * システム設定のDB層
 *
 * SystemSettingsテーブルを使ったKVストア。
 * 管理画面で変更された設定を永続化し、全ユーザーに適用する。
 */

import { prisma } from '@/lib/prisma';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import { isValidProvider } from '@/lib/llm/factory';
import type { LLMProvider } from '@/lib/llm/types';
import type { ChatFeatureId } from '@/lib/chat/chat-config';

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
const CACHE_TTL_MS = 60 * 1000; // 1分間キャッシュ

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
  } catch {
    return null;
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
 * Grokツール設定の型
 * 
 * 各機能でどのツールを有効にするかを設定
 * - search: Web検索（web_search）
 * - xSearch: X検索（x_search）
 * - codeExecution: コード実行（code_execution）
 * - fileSearch: ファイル検索（collections_search）
 */
export interface GrokToolSettings {
  // 機能別の検索ツール設定（デフォルトでON）
  generalChat: boolean;
  researchCast: boolean;
  researchLocation: boolean;
  researchInfo: boolean;
  researchEvidence: boolean;
  minutes: boolean;
  proposal: boolean;
  naScript: boolean;
  
  // 追加ツール設定
  xSearchGeneralChat: boolean;
  xSearchResearchCast: boolean;
  xSearchResearchLocation: boolean;
  xSearchResearchInfo: boolean;
  xSearchResearchEvidence: boolean;
  xSearchMinutes: boolean;
  xSearchProposal: boolean;
  xSearchNaScript: boolean;
  
  codeExecutionGeneralChat: boolean;
  codeExecutionResearchCast: boolean;
  codeExecutionResearchLocation: boolean;
  codeExecutionResearchInfo: boolean;
  codeExecutionResearchEvidence: boolean;
  codeExecutionMinutes: boolean;
  codeExecutionProposal: boolean;
  codeExecutionNaScript: boolean;
  
  fileSearchGeneralChat: boolean;
  fileSearchResearchCast: boolean;
  fileSearchResearchLocation: boolean;
  fileSearchResearchInfo: boolean;
  fileSearchResearchEvidence: boolean;
  fileSearchMinutes: boolean;
  fileSearchProposal: boolean;
  fileSearchNaScript: boolean;
}

/**
 * デフォルトのGrokツール設定
 * 
 * すべてのツールをデフォルトでONに設定
 */
export const DEFAULT_GROK_TOOL_SETTINGS: GrokToolSettings = {
  // Web検索（デフォルトON）
  generalChat: true,
  researchCast: true,
  researchLocation: true,
  researchInfo: true,
  researchEvidence: true,
  minutes: true,
  proposal: true,
  naScript: true,
  
  // X検索（デフォルトON）
  xSearchGeneralChat: true,
  xSearchResearchCast: true,
  xSearchResearchLocation: true,
  xSearchResearchInfo: true,
  xSearchResearchEvidence: true,
  xSearchMinutes: true,
  xSearchProposal: true,
  xSearchNaScript: true,
  
  // コード実行（デフォルトON）
  codeExecutionGeneralChat: true,
  codeExecutionResearchCast: true,
  codeExecutionResearchLocation: true,
  codeExecutionResearchInfo: true,
  codeExecutionResearchEvidence: true,
  codeExecutionMinutes: true,
  codeExecutionProposal: true,
  codeExecutionNaScript: true,
  
  // ファイル検索（デフォルトON）
  fileSearchGeneralChat: true,
  fileSearchResearchCast: true,
  fileSearchResearchLocation: true,
  fileSearchResearchInfo: true,
  fileSearchResearchEvidence: true,
  fileSearchMinutes: true,
  fileSearchProposal: true,
  fileSearchNaScript: true,
};

/**
 * featureIdからGrokToolSettingsのキーに変換
 */
export function featureIdToToolKey(featureId: ChatFeatureId): keyof GrokToolSettings | null {
  const mapping: Record<ChatFeatureId, keyof GrokToolSettings> = {
    'general-chat': 'generalChat',
    'research-cast': 'researchCast',
    'research-location': 'researchLocation',
    'research-info': 'researchInfo',
    'research-evidence': 'researchEvidence',
    'minutes': 'minutes',
    'proposal': 'proposal',
    'na-script': 'naScript',
  };
  return mapping[featureId] ?? null;
}

/**
 * ツールタイプ
 */
export type GrokToolType = 'web_search' | 'x_search' | 'code_execution' | 'collections_search';

/**
 * featureIdとツールタイプから設定キーを取得
 */
export function getToolSettingKey(
  featureId: ChatFeatureId, 
  toolType: GrokToolType
): keyof GrokToolSettings | null {
  const featureMap: Record<ChatFeatureId, string> = {
    'general-chat': 'GeneralChat',
    'research-cast': 'ResearchCast',
    'research-location': 'ResearchLocation',
    'research-info': 'ResearchInfo',
    'research-evidence': 'ResearchEvidence',
    'minutes': 'Minutes',
    'proposal': 'Proposal',
    'na-script': 'NaScript',
  };
  
  const toolPrefixMap: Record<GrokToolType, string> = {
    'web_search': '',
    'x_search': 'xSearch',
    'code_execution': 'codeExecution',
    'collections_search': 'fileSearch',
  };
  
  const feature = featureMap[featureId];
  const prefix = toolPrefixMap[toolType];
  
  if (!feature) return null;
  
  const key = `${prefix}${feature}`;
  return key as keyof GrokToolSettings;
}

/**
 * 特定の機能で特定のツールが有効かどうか
 * 
 * 【変更】2026-02-20: DBからの設定取得を廃止し、常に全ツール有効を返す
 * 全機能ですべてのツール（Web検索、X検索、コード実行、ファイル検索）を使用可能
 */
export async function isToolEnabled(
  _featureId: ChatFeatureId,
  _toolType: GrokToolType
): Promise<boolean> {
  // 常に全ツール有効
  return true;
}

/**
 * ユーザーのGrokツール設定を取得
 */
export async function getGrokToolSettings(userId: string): Promise<GrokToolSettings> {
  try {
    const settings = await (prisma as unknown as { 
      grokToolSettings: { 
        findUnique: (args: { where: { userId: string } }) => Promise<GrokToolSettings | null> 
      } 
    }).grokToolSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      return settings;
    }
  } catch (error) {
    console.error('Failed to get Grok tool settings:', error);
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
  const data = {
    ...DEFAULT_GROK_TOOL_SETTINGS,
    ...settings,
  };

  const result = await (prisma as unknown as { 
    grokToolSettings: { 
      upsert: (args: {
        where: { userId: string };
        update: GrokToolSettings;
        create: GrokToolSettings & { userId: string };
      }) => Promise<GrokToolSettings>;
    } 
  }).grokToolSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  return result;
}

/**
 * 特定の機能でGrokツール（Web検索）が有効かどうか
 * 
 * 【変更】2026-02-20: DBからの設定取得を廃止し、常に有効を返す
 * 全機能ですべてのツールを使用可能
 */
export async function isGrokToolEnabled(
  _userId: string, 
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
      const settings = {
        ...DEFAULT_GROK_TOOL_SETTINGS,
        ...parsed,
      };
      // キャッシュに保存
      setCache(cacheKey, settings);
      return settings;
    }
  } catch (error) {
    console.error('Failed to get system Grok tool settings:', error);
    throw error;
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
  const data: GrokToolSettings = {
    ...DEFAULT_GROK_TOOL_SETTINGS,
    ...settings,
  };

  await setSystemSetting(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS, JSON.stringify(data));
  
  // キャッシュをクリア（次回取得時に新しい値をDBから取得）
  clearCache(SYSTEM_SETTING_KEYS.GROK_TOOL_SETTINGS);
  
  return data;
}
