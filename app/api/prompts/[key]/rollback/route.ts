/**
 * プロンプトロールバックAPI
 * POST /api/prompts/[key]/rollback
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { rollbackPrompt } from "@/lib/prompts/db/versions";

const rollbackSchema = z.object({
  version: z.number().int().positive(),
  changeNote: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    // 開発環境では認証をスキップ
    const isDev = process.env.NODE_ENV === "development";
    let authResult: { user: { id: string } } | NextResponse;

    if (isDev) {
      authResult = { user: { id: "dev-user" } };
    } else {
      authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const { key } = await params;
    const body = await request.json();

    const validation = rollbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.format() },
        { status: 400 },
      );
    }

    const newVersion = await rollbackPrompt(key, validation.data.version, {
      changeNote: validation.data.changeNote,
      changedBy: authResult.user.id,
    });

    return NextResponse.json({
      success: true,
      newVersion: {
        id: newVersion.id,
        version: newVersion.version,
        content: newVersion.content,
        changeNote: newVersion.change_note,
        changedBy: newVersion.changed_by,
        createdAt: newVersion.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to rollback prompt:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to rollback", message }, { status: 500 });
  }
}
