/**
 * Feature Chat API Route
 *
 * GET  /api/chat/feature?chatId=xxx        → 特定チャットの履歴取得
 * GET  /api/chat/feature?featureId=xxx     → チャット一覧取得
 * POST /api/chat/feature                   → 新規チャット作成 or メッセージ追加
 * DELETE /api/chat/feature?chatId=xxx      → 特定チャット削除
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { GrokClient } from "@/lib/llm/clients/grok";

/**
 * チャットのタイトルをGrokで自動生成する（バックグラウンド実行）
 * レスポンスを遅延させないためawaitしない
 */
async function generateAndSaveChatTitle(chatId: string, firstUserMessage: string): Promise<void> {
  try {
    // ツールを全て無効化した安価なモデルでタイトル生成
    const grok = new GrokClient("grok-4-0709", {
      enableWebSearch: false,
      enableXSearch: false,
      enableCodeExecution: false,
      enableFileSearch: false,
    });
    const response = await grok.chat([
      {
        role: "system",
        content: "あなたはチャット会話のタイトルを生成する専門家です。与えられたメッセージの内容を要約した簡潔なタイトルを日本語で生成してください。タイトルのみを返してください。余分な記号や説明は不要です。",
      },
      {
        role: "user",
        content: `以下のメッセージに対して20文字以内のタイトルを生成してください:\n\n${firstUserMessage.slice(0, 500)}`,
      },
    ]);
    const title = response.content.trim().slice(0, 40);
    if (title) {
      await prisma.researchChat.update({
        where: { id: chatId },
        data: { title },
      });
    }
  } catch (err) {
    logger.error("Failed to generate chat title", { chatId, error: String(err) });
  }
}

/**
 * GET /api/chat/feature?chatId=xxx
 * 特定チャットの履歴を取得
 *
 * GET /api/chat/feature?featureId=xxx
 * 機能別チャット一覧を取得（サイドバー用）
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
    const chatId = searchParams.get("chatId");
    const featureId = searchParams.get("featureId");

    // chatId指定: 特定チャットのメッセージを返す
    if (chatId) {
      const chat = await prisma.researchChat.findFirst({
        where: { id: chatId, userId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
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
    }

    // featureId指定: チャット一覧を返す（サイドバー用）
    if (featureId) {
      const chats = await prisma.researchChat.findMany({
        where: {
          userId,
          agentType: featureId.toUpperCase(),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      });

      return new Response(JSON.stringify({ chats }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "chatId or featureId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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
 * 新規チャット作成 + メッセージ追加
 *
 * chatIdなし → 新規チャットセッションを作成してchatIdを返す
 * chatIdあり → 既存チャットにメッセージを追加
 */
const saveRequestSchema = z.object({
  chatId: z.string().optional(),
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

    const { chatId, featureId, messages } = validationResult.data;

    const firstUserMessage = messages.find((m) => m.role === "user");

    let chat;
    let isNewChat = false;

    if (chatId) {
      // 既存チャット: 所有権を確認
      chat = await prisma.researchChat.findFirst({
        where: { id: chatId, userId },
      });
      if (!chat) {
        return new Response(
          JSON.stringify({ error: "Chat not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // 新規チャット作成（タイトルは後からLLMで生成）
      isNewChat = true;
      chat = await prisma.researchChat.create({
        data: {
          userId,
          agentType: featureId.toUpperCase(),
          llmProvider: "GROK_4_1_FAST_REASONING",
        },
      });
    }

    // 全メッセージを置き換え（シンプルに全削除→再挿入）
    await prisma.researchMessage.deleteMany({
      where: { chatId: chat.id },
    });

    if (messages.length > 0) {
      await prisma.researchMessage.createMany({
        data: messages.map((msg) => ({
          chatId: chat!.id,
          role: msg.role.toUpperCase(),
          content: msg.content,
        })),
      });
    }

    // 更新日時を更新
    await prisma.researchChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    // 新規チャットの場合、バックグラウンドでLLMによるタイトルを生成（レスポンスを遅延させない）
    if (isNewChat && firstUserMessage) {
      generateAndSaveChatTitle(chat.id, firstUserMessage.content).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true, chatId: chat.id }), {
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
 * DELETE /api/chat/feature?chatId=xxx
 * 特定チャットを削除
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
    const chatId = searchParams.get("chatId");

    // 後方互換: bodyからfeatureIdを受け取る旧形式もサポート
    if (!chatId) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "chatId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const parsed = z.object({ featureId: z.string() }).safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: "chatId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // featureId指定の場合は最新チャットを1件削除（旧API互換）
      const chat = await prisma.researchChat.findFirst({
        where: { userId, agentType: parsed.data.featureId.toUpperCase() },
        orderBy: { updatedAt: "desc" },
      });
      if (chat) {
        await prisma.researchChat.delete({ where: { id: chat.id } });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // chatId指定: 所有権確認して削除
    const chat = await prisma.researchChat.findFirst({
      where: { id: chatId, userId },
    });

    if (chat) {
      await prisma.researchChat.delete({ where: { id: chat.id } });
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
