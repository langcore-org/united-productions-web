/**
 * Admin Prompt Detail API
 *
 * GET /api/admin/prompts/[key] - プロンプト詳細取得（バージョン履歴付き）
 * PUT /api/admin/prompts/[key] - プロンプト更新（バージョン自動採番）
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse, validationErrorResponse } from "@/lib/api/utils";
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
      return errorResponse("Prompt not found", 404);
    }

    // スネークケースからキャメルケースに変換
    const formattedPrompt = {
      id: prompt.id,
      key: prompt.key,
      name: prompt.name,
      description: prompt.description,
      category: prompt.category,
      isActive: prompt.is_active,
      currentVersion: prompt.current_version,
      changedBy: prompt.changed_by,
      changeNote: prompt.change_note,
      createdAt: prompt.created_at,
      updatedAt: prompt.updated_at,
      versions: prompt.versions.map((v) => ({
        id: v.id,
        promptId: v.prompt_id,
        version: v.version,
        content: v.content,
        changedBy: v.changed_by,
        changeNote: v.change_note,
        createdAt: v.created_at,
      })),
    };

    return NextResponse.json({ success: true, data: formattedPrompt });
  } catch (error) {
    console.error("Failed to fetch prompt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("Failed to fetch prompt", 500);
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
      return validationErrorResponse(error);
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return errorResponse(error.message, 404);
    }

    console.error("Failed to update prompt:", error);
    return errorResponse("Failed to update prompt", 500);
  }
}
