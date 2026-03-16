/**
 * Admin Prompt Restore API
 *
 * POST /api/admin/prompts/[key]/restore - 指定バージョンに復元
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { restorePromptVersion } from "@/lib/prompts";

// 復元リクエストスキーマ
const restoreSchema = z.object({
  version: z.number().int().min(1, "バージョン番号は1以上である必要があります"),
  changeNote: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ key: string }>;
}

/**
 * POST /api/admin/prompts/[key]/restore
 * 指定バージョンに復元（新バージョンとして記録）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const body = await request.json();
    const validatedData = restoreSchema.parse(body);

    // 復元（新バージョンとして記録）
    const restored = await restorePromptVersion(
      decodedKey,
      validatedData.version,
      authResult.userId,
      validatedData.changeNote,
    );

    return NextResponse.json({
      success: true,
      data: {
        key: decodedKey,
        version: restored.current_version,
        restoredFrom: validatedData.version,
        changedBy: restored.changed_by,
        changeNote: restored.change_note,
        updatedAt: restored.updated_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      const message = error.message;
      if (message.includes("not found")) {
        return NextResponse.json({ success: false, error: message }, { status: 404 });
      }
    }

    console.error("Failed to restore prompt:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restore prompt" },
      { status: 500 },
    );
  }
}
