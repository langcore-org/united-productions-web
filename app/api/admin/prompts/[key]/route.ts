/**
 * Admin Prompt Detail API
 *
 * GET /api/admin/prompts/[key] - プロンプト詳細取得（バージョン履歴付き）
 * PUT /api/admin/prompts/[key] - プロンプト更新（バージョン自動採番）
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { getPromptWithHistory, updatePromptWithVersion } from "@/lib/prompts";
import { getPromptFromDB } from "@/lib/prompts/db/crud";

// プロンプト更新用スキーマ
const updatePromptSchema = z.object({
  content: z.string().min(1, "プロンプト内容は必須です"),
  changeNote: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * GET /api/admin/prompts/[key]
 * プロンプト詳細を取得（バージョン履歴付き）
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

    const prompt = await getPromptWithHistory(decodedKey);

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: prompt });
  } catch (error) {
    console.error("Failed to fetch prompt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to fetch prompt", details: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/prompts/[key]
 * プロンプトを更新（バージョン自動採番）
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);

    // 更新（バージョン自動採番）
    const updated = await updatePromptWithVersion(
      decodedKey,
      validatedData.content,
      authResult.userId,
      validatedData.changeNote,
    );

    const content = await getPromptFromDB(decodedKey);

    return NextResponse.json({
      success: true,
      data: {
        key: decodedKey,
        version: updated.current_version,
        content,
        changedBy: updated.changed_by,
        changeNote: updated.change_note,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    console.error("Failed to update prompt:", error);
    return NextResponse.json({ success: false, error: "Failed to update prompt" }, { status: 500 });
  }
}
