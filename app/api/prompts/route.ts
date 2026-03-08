/**
 * プロンプト一覧API
 * GET /api/prompts
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const prompts = await prisma.systemPrompt.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        category: true,
        currentVersion: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}
