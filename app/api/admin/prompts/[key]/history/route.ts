/**
 * Admin Prompt History API
 *
 * GET /api/admin/prompts/[key]/history - バージョン履歴一覧取得
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/utils";
import { getPromptVersionHistory } from "@/lib/prompts";

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/admin/prompts/[key]/history
 * バージョン履歴一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const versions = await getPromptVersionHistory(decodedKey);

    // レスポンスを整形
    const formattedVersions = versions.map((v) => ({
      version: v.version,
      changedBy: v.changed_by,
      changeNote: v.change_note,
      createdAt: v.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: { versions: formattedVersions },
    });
  } catch (error) {
    console.error("Failed to fetch prompt history:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("not found")) {
      return errorResponse(errorMessage, 404);
    }

    return errorResponse("Failed to fetch prompt history", 500);
  }
}
