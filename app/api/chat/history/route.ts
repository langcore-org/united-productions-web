/**
 * Chat History API Route（Supabase版）
 *
 * GET /api/chat/history
 * DELETE /api/chat/history?id=xxx
 */

import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export interface ChatHistoryItem {
  id: string;
  featureId: string;
  title: string;
  agentType: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

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

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    const supabase = await createClient();

    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("id, agent_type, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (chatsError) throw chatsError;

    if (!chats || chats.length === 0) {
      return Response.json({ history: [] });
    }

    const chatIds = chats.map((c) => c.id);
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("chat_id, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false });

    const messagesByChat =
      messages?.reduce(
        (acc, msg) => {
          if (!acc[msg.chat_id]) acc[msg.chat_id] = [];
          acc[msg.chat_id].push(msg);
          return acc;
        },
        {} as Record<string, typeof messages>,
      ) || {};

    const history: ChatHistoryItem[] = chats.map((chat) => {
      const chatMessages = messagesByChat[chat.id] || [];
      const lastMessage = chatMessages[0];
      const title =
        chat.title || lastMessage?.content.slice(0, 30) || getAgentTypeLabel(chat.agent_type);

      return {
        id: chat.id,
        featureId: chat.agent_type.toLowerCase().replace(/_/g, "-"),
        title: title.length > 30 ? `${title}...` : title,
        agentType: getAgentTypeLabel(chat.agent_type),
        updatedAt: chat.updated_at,
        messageCount: chatMessages.length,
        lastMessage: lastMessage?.content.slice(0, 100),
      };
    });

    return Response.json({ history });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get chat history`, { error: errorMessage });
    return Response.json({ error: "Failed to get chat history", requestId }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("id");

    if (!chatId) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to delete chat`, { error: errorMessage });
    return Response.json({ error: "Failed to delete chat", requestId }, { status: 500 });
  }
}
