/**
 * LLM Stream API Route
 *
 * POST /api/llm/stream
 * Server-Sent Events形式でストリーミングレスポンスを返すエンドポイント
 * GrokClient（xAI Responses API）を直接使用
 *
 * SSEイベント形式（新形式）:
 *   data: {"type": "start"}
 *   data: {"type": "tool_call", "id": "...", "name": "web_search", "displayName": "Web検索", "status": "running"}
 *   data: {"type": "tool_call", "id": "...", "name": "web_search", "displayName": "Web検索", "status": "completed"}
 *   data: {"type": "content", "delta": "回答の一部..."}
 *   data: {"type": "done", "usage": {"inputTokens": ..., "outputTokens": ..., "cost": ..., "toolCalls": {...}}}
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createSystemPrompt } from "@/lib/knowledge/programs";
import { GrokClient } from "@/lib/llm/clients/grok";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import { isValidProvider } from "@/lib/llm/factory";
import type { LLMMessage, LLMProvider, SSEEvent } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("StreamAPI");

const streamRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  /** 番組ID（"all"または特定の番組ID） */
  programId: z.string().optional(),
});

export type StreamRequest = z.infer<typeof streamRequestSchema>;

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const isDev = process.env.NODE_ENV === "development";

  try {
    logger.info(`[${requestId}] Stream request started (dev=${isDev})`);

    // 認証チェック（開発環境ではスキップ）
    let authResult: { user: { id: string }; userId: string } | Response | null = null;
    if (isDev) {
      authResult = { user: { id: "dev-user" }, userId: "dev-user" };
    } else {
      authResult = await requireAuth(request);
    }

    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await request.json();

    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`);
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: validationResult.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
          requestId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages, provider: requestedProvider, programId } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return new Response(JSON.stringify({ error: "Invalid provider", requestId }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider: ${provider}`);

    if (!provider.startsWith("grok-")) {
      return new Response(
        JSON.stringify({
          error: `Provider "${provider}" is not supported for streaming`,
          requestId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // システムプロンプトを生成（番組選択対応）
    const systemPrompt = createSystemPrompt(programId ?? "all");

    // メッセージにシステムプロンプトを追加
    const messagesWithSystem: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const client = new GrokClient(provider);
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of client.streamWithUsage(messagesWithSystem)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            // done または error イベントの後はストリームを閉じる
            if (event.type === "done" || event.type === "error") {
              controller.close();
              return;
            }
          }
          controller.close();
        } catch (err) {
          const errorEvent: SSEEvent = {
            type: "error",
            message: err instanceof Error ? err.message : "Internal server error",
          };
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          } catch {
            // コントローラーが既に閉じている場合は無視
          }
          controller.close();
        }
      },
      cancel() {
        logger.info(`[${requestId}] Stream cancelled by client`);
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error(`[${requestId}] Error`, { error: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage, requestId }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
