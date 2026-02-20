/**
 * Grokツール設定 API Route
 *
 * GET /api/settings/grok-tools
 * POST /api/settings/grok-tools
 *
 * 機能別のGrokツール（Web検索）有効化設定を管理
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { 
  getGrokToolSettings, 
  saveGrokToolSettings,
  type GrokToolSettings 
} from "@/lib/settings/db";

/**
 * GET /api/settings/grok-tools
 * 現在のGrokツール設定を取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    const settings = await getGrokToolSettings(userId);

    return new Response(
      JSON.stringify(settings),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get Grok tool settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to get settings", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/settings/grok-tools
 * Grokツール設定を保存
 */
const saveSettingsSchema = z.object({
  generalChat: z.boolean().optional(),
  researchCast: z.boolean().optional(),
  researchLocation: z.boolean().optional(),
  researchInfo: z.boolean().optional(),
  researchEvidence: z.boolean().optional(),
  minutes: z.boolean().optional(),
  proposal: z.boolean().optional(),
  naScript: z.boolean().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

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

    const settings = await saveGrokToolSettings(userId, validationResult.data);

    logger.info(`[${requestId}] Grok tool settings saved`, { userId });

    return new Response(
      JSON.stringify({
        success: true,
        ...settings,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save Grok tool settings`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to save settings", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
