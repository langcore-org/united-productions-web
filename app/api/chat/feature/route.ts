/**
 * Feature Chat API Route（Supabase版）
 *
 * GET  /api/chat/feature?chatId=xxx        → 特定チャットの履歴取得
 * GET  /api/chat/feature?featureId=xxx     → チャット一覧取得
 * POST /api/chat/feature                   → 新規チャット作成 or メッセージ追加
 * DELETE /api/chat/feature?chatId=xxx      → 特定チャット削除
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createLLMClient } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

async function generateAndSaveChatTitle(chatId: string, firstUserMessage: string): Promise<void> {
  try {
    const grok = createLLMClient("grok-4-0709");
    const response = await grok.chat([
      {
        role: "system",
        content:
          "あなたはチャット会話のタイトルを生成する専門家です。与えられたメッセージの内容を要約した簡潔なタイトルを日本語で生成してください。タイトルのみを返してください。余分な記号や説明は不要です。",
      },
      {
        role: "user",
        content: `以下のメッセージに対して20文字以内のタイトルを生成してください:\n\n${firstUserMessage.slice(0, 500)}`,
      },
    ]);
    const title = response.content.trim().slice(0, 40);
    if (title) {
      const supabase = await createClient();
      await supabase.from("chats").update({ title }).eq("id", chatId);
    }
  } catch (err) {
    logger.error("Failed to generate chat title", { chatId, error: String(err) });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const featureId = searchParams.get("featureId");

    if (chatId) {
      const { data: chat } = await supabase
        .from("chats")
        .select("id, llm_provider")
        .eq("id", chatId)
        .eq("user_id", userId)
        .single();

      if (!chat) {
        return Response.json({ messages: [] });
      }

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      const messages = (msgs || []).map((m) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        timestamp: m.created_at,
        llmProvider: m.llm_provider ?? chat.llm_provider,
        toolCalls: m.tool_calls_json ?? undefined,
        citations: m.citations_json ?? undefined,
        usage:
          m.input_tokens != null
            ? { inputTokens: m.input_tokens, outputTokens: m.output_tokens, cost: m.cost_usd }
            : undefined,
      }));

      return Response.json({ messages });
    }

    if (featureId) {
      const { data: chats } = await supabase
        .from("chats")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .eq("agent_type", featureId.toUpperCase())
        .order("updated_at", { ascending: false });

      return Response.json({ chats: chats || [] });
    }

    return Response.json({ error: "chatId or featureId is required" }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get conversation`, { error: errorMessage });
    return Response.json({ error: "Failed to get conversation", requestId }, { status: 500 });
  }
}

const saveRequestSchema = z.object({
  chatId: z.string().optional(),
  featureId: z.string(),
  programId: z.string().optional(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()).optional(),
      llmProvider: z.enum(["GROK_4_1_FAST_REASONING", "GROK_4_0709"]).optional(),
      toolCalls: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            displayName: z.string(),
            status: z.string(),
            input: z.string().optional(),
          }),
        )
        .optional(),
      citations: z.array(z.object({ url: z.string(), title: z.string() })).optional(),
      usage: z
        .object({
          inputTokens: z.number(),
          outputTokens: z.number(),
          cost: z.number(),
        })
        .optional(),
    }),
  ),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validationResult = saveRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error(`[${requestId}] Validation failed`, {
        errors: validationResult.error.issues,
        body: JSON.stringify(body).slice(0, 500),
      });
      return Response.json(
        { error: "Invalid request", details: validationResult.error.format() },
        { status: 400 },
      );
    }

    const { chatId, featureId, programId, messages } = validationResult.data;
    const firstUserMessage = messages.find((m) => m.role === "user");
    const supabase = await createClient();

    let actualChatId: string;
    let isNewChat = false;

    if (chatId) {
      const { data: existing } = await supabase
        .from("chats")
        .select("id, program_id")
        .eq("id", chatId)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        return Response.json({ error: "Chat not found" }, { status: 404 });
      }
      actualChatId = existing.id;

      // 既存チャットが program 未設定で、リクエストに programId がある場合のみ保存
      if (existing.program_id == null && programId) {
        await supabase
          .from("chats")
          .update({ program_id: programId })
          .eq("id", actualChatId)
          .eq("user_id", userId);
      }
    } else {
      isNewChat = true;
      const { data: newChat, error: createError } = await supabase
        .from("chats")
        .insert({
          user_id: userId,
          agent_type: featureId.toUpperCase(),
          llm_provider: "GROK_4_1_FAST_REASONING",
          program_id: programId ?? null,
        })
        .select("id")
        .single();

      if (createError || !newChat) throw createError || new Error("Chat creation failed");
      actualChatId = newChat.id;
    }

    await supabase.from("chat_messages").delete().eq("chat_id", actualChatId);

    if (messages.length > 0) {
      const { error: insertError } = await supabase.from("chat_messages").insert(
        messages.map((msg) => ({
          chat_id: actualChatId,
          role: msg.role.toUpperCase(),
          content: msg.content,
          llm_provider: msg.llmProvider ?? null,
          input_tokens: msg.usage?.inputTokens ?? null,
          output_tokens: msg.usage?.outputTokens ?? null,
          cost_usd: msg.usage?.cost ?? null,
          tool_calls_json: msg.toolCalls?.length ? msg.toolCalls : null,
          citations_json: msg.citations?.length ? msg.citations : null,
        })),
      );
      if (insertError) throw insertError;
    }

    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", actualChatId);

    if (isNewChat && firstUserMessage) {
      generateAndSaveChatTitle(actualChatId, firstUserMessage.content).catch(() => {});
    }

    return Response.json({ success: true, chatId: actualChatId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save conversation`, { error: errorMessage });
    return Response.json({ error: "Failed to save conversation", requestId }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.user.id;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "chatId is required" }, { status: 400 });
      }

      const parsed = z.object({ featureId: z.string() }).safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: "chatId is required" }, { status: 400 });
      }

      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("user_id", userId)
        .eq("agent_type", parsed.data.featureId.toUpperCase())
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (chat) {
        await supabase.from("chats").delete().eq("id", chat.id);
      }
      return Response.json({ success: true });
    }

    await supabase.from("chats").delete().eq("id", chatId).eq("user_id", userId);
    return Response.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to delete conversation`, { error: errorMessage });
    return Response.json({ error: "Failed to delete conversation", requestId }, { status: 500 });
  }
}
