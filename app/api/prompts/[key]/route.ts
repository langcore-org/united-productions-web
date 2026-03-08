/**
 * 特定プロンプトの最新バージョンAPI
 * GET /api/prompts/[key]
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getLatestPrompt } from "@/lib/prompts/db/versions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    // 開発環境では認証をスキップ
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const { key } = await params;
    const latest = await getLatestPrompt(key);

    if (!latest) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({
      key,
      content: latest.content,
      version: latest.version,
    });
  } catch (error) {
    console.error("Failed to fetch prompt:", error);
    return NextResponse.json({ error: "Failed to fetch prompt" }, { status: 500 });
  }
}
