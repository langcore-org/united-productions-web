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
  type GrokToolSettings 
} from "@/lib/settings/db";

/**
 * GET /api/settings/grok-tools
 * システム全体のGrokツール設定を取得
 * DBに設定がない場合は404エラーを返す
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 管理者権限チェック
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    const settings = await getSystemGrokToolSettings();

    // DBに設定がない場合は404エラー
    if (settings === null) {
      return new Response(
        JSON.stringify({ 
          error: "Grokツール設定が見つかりません。先に設定を保存してください。",
          requestId 
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

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
      JSON.stringify({ error: "設定の取得に失敗しました", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/settings/grok-tools
 * システム全体のGrokツール設定を保存
 */
const saveSettingsSchema = z.object({
  // Web検索
  generalChat: z.boolean().optional(),
  researchCast: z.boolean().optional(),
  researchLocation: z.boolean().optional(),
  researchInfo: z.boolean().optional(),
  researchEvidence: z.boolean().optional(),
  minutes: z.boolean().optional(),
  proposal: z.boolean().optional(),
  naScript: z.boolean().optional(),
  
  // X検索
  xSearchGeneralChat: z.boolean().optional(),
  xSearchResearchCast: z.boolean().optional(),
  xSearchResearchLocation: z.boolean().optional(),
  xSearchResearchInfo: z.boolean().optional(),
  xSearchResearchEvidence: z.boolean().optional(),
  xSearchMinutes: z.boolean().optional(),
  xSearchProposal: z.boolean().optional(),
  xSearchNaScript: z.boolean().optional(),
  
  // コード実行
  codeExecutionGeneralChat: z.boolean().optional(),
  codeExecutionResearchCast: z.boolean().optional(),
  codeExecutionResearchLocation: z.boolean().optional(),
  codeExecutionResearchInfo: z.boolean().optional(),
  codeExecutionResearchEvidence: z.boolean().optional(),
  codeExecutionMinutes: z.boolean().optional(),
  codeExecutionProposal: z.boolean().optional(),
  codeExecutionNaScript: z.boolean().optional(),
  
  // ファイル検索
  fileSearchGeneralChat: z.boolean().optional(),
  fileSearchResearchCast: z.boolean().optional(),
  fileSearchResearchLocation: z.boolean().optional(),
  fileSearchResearchInfo: z.boolean().optional(),
  fileSearchResearchEvidence: z.boolean().optional(),
  fileSearchMinutes: z.boolean().optional(),
  fileSearchProposal: z.boolean().optional(),
  fileSearchNaScript: z.boolean().optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 管理者権限チェック
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
      JSON.stringify({ error: "設定の保存に失敗しました", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
