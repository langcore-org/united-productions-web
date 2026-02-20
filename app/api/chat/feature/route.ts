/**
 * Feature Chat API Route
 *
 * GET /api/chat/feature?featureId=xxx
 * POST /api/chat/feature
 *
 * 各機能ページ用のチャットAPI
 * - 会話履歴の取得・保存
 * - ストリーミングレスポンス
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/chat/feature?featureId=xxx
 * 会話履歴を取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get("featureId");

    if (!featureId) {
      return new Response(
        JSON.stringify({ error: "featureId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ResearchChatテーブルから履歴を取得
    const chat = await prisma.researchChat.findFirst({
      where: {
        userId,
        agentType: featureId.toUpperCase(),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!chat) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = chat.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase(),
      content: m.content,
      timestamp: m.createdAt,
      llmProvider: chat.llmProvider,
    }));

    return new Response(JSON.stringify({ messages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get conversation`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to get conversation", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/chat/feature
 * 会話履歴を保存（全メッセージを置き換え）
 */
const saveRequestSchema = z.object({
  featureId: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()).optional(),
      llmProvider: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = saveRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { featureId, messages } = validationResult.data;

    // 既存のチャットを検索
    let chat = await prisma.researchChat.findFirst({
      where: {
        userId,
        agentType: featureId.toUpperCase(),
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!chat) {
      // 新規作成
      chat = await prisma.researchChat.create({
        data: {
          userId,
          agentType: featureId.toUpperCase(),
          llmProvider: "GROK_4_1_FAST_REASONING",
        },
      });
    }

    // 既存のメッセージを全て削除
    await prisma.researchMessage.deleteMany({
      where: { chatId: chat.id },
    });

    // 新しいメッセージを全て保存
    if (messages.length > 0) {
      await prisma.researchMessage.createMany({
        data: messages.map((msg) => ({
          chatId: chat!.id,
          role: msg.role.toUpperCase(),
          content: msg.content,
        })),
      });
    }

    // チャットの更新日時を更新
    await prisma.researchChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save conversation`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to save conversation", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/chat/feature
 * 会話履歴を削除
 */
const deleteRequestSchema = z.object({
  featureId: z.string(),
});

export async function DELETE(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = deleteRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { featureId } = validationResult.data;

    // チャットを検索して削除
    const chat = await prisma.researchChat.findFirst({
      where: {
        userId,
        agentType: featureId.toUpperCase(),
      },
    });

    if (chat) {
      // 関連するメッセージも自動削除（CASCADE）
      await prisma.researchChat.delete({
        where: { id: chat.id },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to delete conversation`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to delete conversation", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
