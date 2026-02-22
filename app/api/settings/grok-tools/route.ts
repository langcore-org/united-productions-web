/**
 * Grokツール設定 API Route（システム設定版）
 *
 * GET /api/settings/grok-tools
 * POST /api/settings/grok-tools
 *
 * システム全体のGrokツール有効化設定を管理
 * 管理者のみアクセス可能
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import {
  getSystemGrokToolSettings,
  setSystemGrokToolSettings,
  DEFAULT_GROK_TOOL_SETTINGS,
  type GrokToolSettings,
} from "@/lib/settings/db";

/**
 * GET /api/settings/grok-tools
 * システム全体のGrokツール設定を取得
 * DBに設定がない場合はデフォルト値を返す
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    const settings = await getSystemGrokToolSettings();
    const data: GrokToolSettings = settings ?? DEFAULT_GROK_TOOL_SETTINGS;

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get Grok tool settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "設定の取得に失敗しました", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/settings/grok-tools
 * システム全体のGrokツール設定を保存
 *
 * body: Record<ChatFeatureId, GrokToolType[]>
 */
const toolTypeSchema = z.enum([
  "web_search",
  "x_search",
  "code_execution",
  "collections_search",
]);

const featureIdSchema = z.enum([
  "general-chat",
  "research-cast",
  "research-location",
  "research-info",
  "research-evidence",
  "minutes",
  "proposal",
  "na-script",
]);

const saveSettingsSchema = z.record(featureIdSchema, z.array(toolTypeSchema));

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAdmin(request);
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

    const validationResult = saveSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const settings = await setSystemGrokToolSettings(validationResult.data);

    logger.info(`[${requestId}] System Grok tool settings saved`, {
      adminId: authResult.user.id,
    });

    return new Response(JSON.stringify(settings), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save Grok tool settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "設定の保存に失敗しました", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
