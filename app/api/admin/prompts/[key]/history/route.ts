/**
 * Admin Prompt History API
 * 
 * GET /api/admin/prompts/[key]/history - バージョン履歴一覧取得
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getPromptVersionHistory } from "@/lib/prompts/db";

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/admin/prompts/[key]/history
 * バージョン履歴一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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
      changedBy: v.changedBy,
      changeNote: v.changeNote,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: { versions: formattedVersions },
    });
  } catch (error) {
    console.error("Failed to fetch prompt history:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("not found")) {
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch prompt history", details: errorMessage },
      { status: 500 }
    );
  }
}
