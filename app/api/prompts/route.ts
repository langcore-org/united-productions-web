/**
 * Prompts API
 * 
 * GET /api/prompts?key=xxx - 特定のプロンプトを取得
 * GET /api/prompts?category=xxx - カテゴリ別プロンプト一覧
 * GET /api/prompts?gemId=xxx - Gem用のプロンプトを取得
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";

// Gem IDとプロンプトキーのマッピング
const GEM_PROMPT_MAP: Record<string, string> = {
  "general": "GENERAL_CHAT",
  "research-cast": "RESEARCH_CAST",
  "research-location": "RESEARCH_LOCATION",
  "research-info": "RESEARCH_INFO",
  "research-evidence": "RESEARCH_EVIDENCE",
  "minutes": "MINUTES",
  "proposal": "PROPOSAL",
  "na-script": "TRANSCRIPT",
};

/**
 * GET /api/prompts
 * プロンプトを取得
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const category = searchParams.get("category");
    const gemId = searchParams.get("gemId");

    // Gem IDが指定された場合
    if (gemId) {
      const promptKey = GEM_PROMPT_MAP[gemId];
      if (!promptKey) {
        return NextResponse.json(
          { success: false, error: "Unknown gem ID" },
          { status: 400 }
        );
      }

      const prompt = await prisma.systemPrompt.findUnique({
        where: { key: promptKey, isActive: true },
        select: { key: true, name: true, content: true, category: true },
      });

      if (!prompt) {
        return NextResponse.json(
          { success: false, error: "Prompt not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: prompt });
    }

    // 特定のキーが指定された場合
    if (key) {
      const prompt = await prisma.systemPrompt.findUnique({
        where: { key, isActive: true },
        select: { key: true, name: true, content: true, category: true, description: true },
      });

      if (!prompt) {
        return NextResponse.json(
          { success: false, error: "Prompt not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: prompt });
    }

    // カテゴリ別一覧
    const prompts = await prisma.systemPrompt.findMany({
      where: category ? { category, isActive: true } : { isActive: true },
      select: { key: true, name: true, description: true, category: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: prompts });
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}
