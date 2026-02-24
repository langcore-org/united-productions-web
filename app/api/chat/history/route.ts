/**
 * Chat History API Route
 *
 * GET /api/chat/history
 * ユーザーの全チャット履歴を取得（サイドバー用）
 */

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export interface ChatHistoryItem {
  id: string;
  featureId: string;
  title: string;
  agentType: string;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

/**
 * エージェントタイプから表示名を取得
 */
function getAgentTypeLabel(agentType: string): string {
  const labels: Record<string, string> = {
    "RESEARCH-CAST": "出演者リサーチ",
    "RESEARCH-LOCATION": "場所リサーチ",
    "RESEARCH-INFO": "情報リサーチ",
    "RESEARCH-EVIDENCE": "エビデンスリサーチ",
    MINUTES: "議事録作成",
    PROPOSAL: "新企画立案",
    "NA-SCRIPT": "NA原稿作成",
    "GENERAL-CHAT": "チャット",
  };
  return labels[agentType.toUpperCase()] || "チャット";
}

/**
 * GET /api/chat/history
 * 全チャット履歴を取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    // ユーザーの全チャットを取得
    const chats = await prisma.researchChat.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const history: ChatHistoryItem[] = chats.map((chat) => {
      const lastMessage = chat.messages[0];
      // 最初のユーザーメッセージをタイトルとして使用
      const title = lastMessage?.content.slice(0, 30) || getAgentTypeLabel(chat.agentType);

      return {
        id: chat.id,
        featureId: chat.agentType.toLowerCase().replace(/_/g, "-"),
        title: title.length > 30 ? `${title}...` : title,
        agentType: getAgentTypeLabel(chat.agentType),
        updatedAt: chat.updatedAt,
        messageCount: chat._count.messages,
        lastMessage: lastMessage?.content.slice(0, 100),
      };
    });

    return new Response(JSON.stringify({ history }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get chat history`, {
      error: errorMessage,
    });
    return new Response(JSON.stringify({ error: "Failed to get chat history", requestId }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * DELETE /api/chat/history?id=xxx
 * 特定のチャット履歴を削除
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("id");

    if (!chatId) {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // チャットがユーザーのものか確認して削除
    const chat = await prisma.researchChat.findFirst({
      where: {
        id: chatId,
        userId,
      },
    });

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.researchChat.delete({
      where: { id: chatId },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to delete chat`, {
      error: errorMessage,
    });
    return new Response(JSON.stringify({ error: "Failed to delete chat", requestId }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
