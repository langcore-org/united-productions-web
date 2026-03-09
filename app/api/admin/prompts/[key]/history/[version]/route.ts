/**
 * Admin Prompt Version Detail API
 *
 * GET /api/admin/prompts/[key]/history/[version] - 特定バージョンの内容取得
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getPromptVersion } from "@/lib/prompts";

interface RouteParams {
  params: Promise<{ key: string; version: string }>;
}

/**
 * GET /api/admin/prompts/[key]/history/[version]
 * 特定バージョンのプロンプト内容を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { key, version } = await params;
    const decodedKey = decodeURIComponent(key);
    const versionNum = parseInt(version, 10);

    if (Number.isNaN(versionNum) || versionNum < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid version number" },
        { status: 400 },
      );
    }

    const versionData = await getPromptVersion(decodedKey, versionNum);

    if (!versionData) {
      return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        version: versionData.version,
        content: versionData.content,
        changedBy: versionData.changed_by,
        changeNote: versionData.change_note,
        createdAt: versionData.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to fetch prompt version:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to fetch prompt version", details: errorMessage },
      { status: 500 },
    );
  }
}
