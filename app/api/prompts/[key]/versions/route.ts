/**
 * プロンプトバージョン管理API
 * GET  /api/prompts/[key]/versions - バージョン履歴一覧
 * POST /api/prompts/[key]/versions - 新しいバージョンを作成
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { createPromptVersion, getPromptVersions } from "@/lib/prompts/db/versions";

const createVersionSchema = z.object({
  content: z.string().min(1),
  changeNote: z.string().optional(),
});

// GET: バージョン履歴一覧
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const prompt = await prisma.systemPrompt.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        name: true,
        currentVersion: true,
      },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const versions = await getPromptVersions(key, { limit, offset });

    return NextResponse.json({
      prompt,
      versions,
    });
  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

// POST: 新しいバージョンを作成
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

    const validation = createVersionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.format() },
        { status: 400 },
      );
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
        changeNote: version.changeNote,
        changedBy: version.changedBy,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create version:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create version", message }, { status: 500 });
  }
}
