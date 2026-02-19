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
