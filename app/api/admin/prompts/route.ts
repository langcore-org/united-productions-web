/**
 * Admin Prompts API
 * 
 * GET /api/admin/prompts - 全プロンプト一覧取得
 * PUT /api/admin/prompts/:key - プロンプト更新
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";

// プロンプト更新用スキーマ
const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/prompts
 * 全プロンプト一覧を取得
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const key = searchParams.get("key");

    // 特定のキーが指定された場合
    if (key) {
      const prompt = await prisma.systemPrompt.findUnique({
        where: { key },
      });

      if (!prompt) {
        return NextResponse.json(
          { success: false, error: "Prompt not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: prompt });
    }

    // 全プロンプト取得（カテゴリフィルタ対応）
    const prompts = await prisma.systemPrompt.findMany({
      where: category ? { category } : undefined,
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

/**
 * PUT /api/admin/prompts?key=xxx
 * プロンプトを更新
 */
export async function PUT(request: NextRequest) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key parameter is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);

    const updatedPrompt = await prisma.systemPrompt.update({
      where: { key },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updatedPrompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to update prompt:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}
