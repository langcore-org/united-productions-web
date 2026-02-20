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
} as const;

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
 */
export interface GrokToolSettings {
  generalChat: boolean;
  researchCast: boolean;
  researchLocation: boolean;
  researchInfo: boolean;
  researchEvidence: boolean;
  minutes: boolean;
  proposal: boolean;
  naScript: boolean;
}

/**
 * デフォルトのGrokツール設定
 */
export const DEFAULT_GROK_TOOL_SETTINGS: GrokToolSettings = {
  generalChat: false,
  researchCast: false,
  researchLocation: false,
  researchInfo: true,
  researchEvidence: true,
  minutes: false,
  proposal: false,
  naScript: false,
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
 */
export async function isGrokToolEnabled(
  userId: string, 
  featureId: ChatFeatureId
): Promise<boolean> {
  const settings = await getGrokToolSettings(userId);
  const key = featureIdToToolKey(featureId);
  
  if (!key) return false;
  
  return settings[key] ?? false;
}
