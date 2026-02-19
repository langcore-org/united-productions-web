/**
 * 設定管理API
 * 
 * GET /api/admin/settings - 設定一覧を取得
 * POST /api/admin/settings - 設定を保存
 * PUT /api/admin/settings/reset - 設定をデフォルトに戻す
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import {
  SettingItem,
  SettingValue,
  DEFAULT_SETTINGS,
  validateSetting,
} from "@/lib/settings/types";
import {
  SYSTEM_SETTING_KEYS,
  getSystemSetting,
  setSystemSetting,
  deleteSystemSetting,
} from "@/lib/settings/db";

// インメモリストレージ（DB非対応の設定はここで管理）
let currentSettings: SettingItem[] = [...DEFAULT_SETTINGS];

/**
 * DB永続化対象の設定（settingId → DBキー）
 * ここに追加するだけでDB保存対象になる
 */
const DB_PERSISTED_SETTINGS: Record<string, typeof SYSTEM_SETTING_KEYS[keyof typeof SYSTEM_SETTING_KEYS]> = {
  'llm-default-provider': SYSTEM_SETTING_KEYS.DEFAULT_LLM_PROVIDER,
};

/**
 * DB永続化設定をインメモリ設定に反映して返す
 */
async function getSettingsWithDb(settings: SettingItem[]): Promise<SettingItem[]> {
  const merged = [...settings];
  for (const [settingId, dbKey] of Object.entries(DB_PERSISTED_SETTINGS)) {
    const dbValue = await getSystemSetting(dbKey);
    if (dbValue !== null) {
      const idx = merged.findIndex(s => s.id === settingId);
      if (idx !== -1) {
        merged[idx] = { ...merged[idx], value: dbValue };
      }
    }
  }
  return merged;
}

/**
 * GET /api/admin/settings
 * 現在の設定を全て取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // DB永続化設定をマージしてから返す
    const mergedSettings = await getSettingsWithDb(currentSettings);
    currentSettings = mergedSettings;

    const safeSettings = currentSettings.map((setting) => ({
      ...setting,
      value: setting.secret ? "********" : setting.value,
    }));

    return new Response(JSON.stringify({ settings: safeSettings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get settings`, { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Failed to get settings", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/admin/settings
 * 設定を更新
 */
const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      id: z.string(),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    })
  ),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = updateSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { settings: updates } = validationResult.data;
    const errors: { id: string; message: string }[] = [];

    // 各設定を更新
    for (const update of updates) {
      const settingIndex = currentSettings.findIndex((s) => s.id === update.id);
      if (settingIndex === -1) {
        errors.push({ id: update.id, message: "設定が見つかりません" });
        continue;
      }

      const setting = currentSettings[settingIndex];

      // 読み取り専用チェック
      if (setting.readOnly) {
        errors.push({ id: update.id, message: "この設定は読み取り専用です" });
        continue;
      }

      // 値の検証
      const validationError = validateSetting(setting, update.value);
      if (validationError) {
        errors.push({ id: update.id, message: validationError });
        continue;
      }

      // 設定を更新（インメモリ）
      currentSettings[settingIndex] = {
        ...setting,
        value: update.value,
      };

      // DB永続化対象の設定はDBにも保存
      const dbKey = DB_PERSISTED_SETTINGS[update.id];
      if (dbKey) {
        await setSystemSetting(dbKey, String(update.value));
      }
    }

    logger.info(`[${requestId}] Settings updated`, { 
      updatedCount: updates.length - errors.length,
      errorCount: errors.length 
    });

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length - errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to update settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to update settings", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * PUT /api/admin/settings
 * 設定をデフォルトに戻す
 */
export async function PUT(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // デフォルトに戻す（インメモリ）
    currentSettings = DEFAULT_SETTINGS.map((setting) => ({
      ...setting,
      value: setting.defaultValue,
    }));

    // DB永続化設定も削除（デフォルト値にリセット）
    for (const dbKey of Object.values(DB_PERSISTED_SETTINGS)) {
      await deleteSystemSetting(dbKey);
    }

    logger.info(`[${requestId}] Settings reset to default`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "設定をデフォルトに戻しました",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to reset settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to reset settings", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
