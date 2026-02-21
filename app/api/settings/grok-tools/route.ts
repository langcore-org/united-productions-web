/**
 * Grokツール設定 API Route（システム設定版）
 *
 * GET /api/settings/grok-tools
 * POST /api/settings/grok-tools
 *
 * システム全体のGrokツール有効化設定を管理
 * 管理者のみアクセス可能
 * 
 * 注意: 2026-02-20 全ツール常時有効化に伴い、このAPIは現在無効化されています
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/settings/grok-tools
 * 常に全ツール有効を返す（設定不要）
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 管理者権限チェック
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // 全ツール常時有効
    return new Response(
      JSON.stringify({
        message: "全ツールが常時有効です（設定不要）",
        allToolsEnabled: true,
      }),
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
 * 設定保存（現在は無効化）
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 管理者権限チェック
    const authResult = await requireAdmin(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // 全ツール常時有効のため、設定保存は不要
    return new Response(
      JSON.stringify({
        message: "全ツールが常時有効です（設定不要）",
        allToolsEnabled: true,
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
