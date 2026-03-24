/**
 * プロンプトバージョン管理API（Supabase版）
 * GET  /api/prompts/[key]/versions
 * POST /api/prompts/[key]/versions
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse, validationErrorResponse } from "@/lib/api/utils";
import { createPromptVersion, getPromptVersions } from "@/lib/prompts/db/versions";
import { createClient } from "@/lib/supabase/server";

const createVersionSchema = z.object({
  content: z.string().min(1),
  changeNote: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    let authResult: { user: { id: string } } | NextResponse;

    if (isDev) {
      authResult = { user: { id: "dev-user" } };
    } else {
      authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) return authResult;
    }

    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabase = await createClient();
    const { data: prompt, error } = await supabase
      .from("system_prompts")
      .select("id, key, name, current_version")
      .eq("key", key)
      .single();

    if (error || !prompt) {
      return errorResponse("Prompt not found", 404);
    }

    const versions = await getPromptVersions(key, { limit, offset });

    // スネークケースからキャメルケースに変換
    const formattedPrompt = {
      id: prompt.id,
      key: prompt.key,
      name: prompt.name,
      currentVersion: prompt.current_version,
    };

    const formattedVersions = versions.map((v) => ({
      version: v.version,
      changeNote: v.change_note,
      changedBy: v.changed_by,
      createdAt: v.created_at,
    }));

    return NextResponse.json({ prompt: formattedPrompt, versions: formattedVersions });
  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return errorResponse("Failed to fetch versions", 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    let authResult: { user: { id: string } } | NextResponse;

    if (isDev) {
      authResult = { user: { id: "dev-user" } };
    } else {
      authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) return authResult;
    }

    const { key } = await params;
    const body = await request.json();

    const validation = createVersionSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const version = await createPromptVersion(key, {
      content: validation.data.content,
      changeNote: validation.data.changeNote,
      changedBy: authResult.user.id,
    });

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        version: version.version,
        content: version.content,
        changeNote: version.change_note,
        changedBy: version.changed_by,
        createdAt: version.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to create version:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse("Failed to create version", 500);
  }
}
