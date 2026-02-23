/**
 * LLM Stream API Route (LangChain版)
 *
 * POST /api/llm/stream
 * Server-Sent Events形式でストリーミングレスポンスを返すエンドポイント
 * LangChainを使用して実装
 *
 * @updated 2026-02-22 11:40
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import { isValidProvider } from "@/lib/llm/factory";
import { createSSEStream, executeStreamingChat } from "@/lib/llm/langchain/chains/streaming";
import { createLangChainModel } from "@/lib/llm/langchain/factory";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("LangChainStreamAPI");

/**
 * リクエストバリデーションスキーマ
 */
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
  /** ツールオプション */
  toolOptions: z
    .object({
      enableWebSearch: z.boolean().optional(),
    })
    .optional(),
});

export type StreamRequest = z.infer<typeof streamRequestSchema>;

/**
 * POST /api/llm/stream
 *
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "grok-4-1-fast-reasoning",
 *   "temperature": 0.7,
 *   "toolOptions": { "enableWebSearch": true }
 * }
 *
 * Response: Server-Sent Events
 * data: {"accepted": true}
 * data: {"stepStart": {"step": 1, "id": "step-1-xxx", "title": "分析と計画", ...}}
 * data: {"toolCallEvent": {"id": "tool-1", "type": "web_search", "status": "running", ...}}
 * data: {"stepUpdate": {"id": "step-1-xxx", "content": "..."}}
 * data: {"toolCallEvent": {"id": "tool-1", "type": "web_search", "status": "completed", ...}}
 * data: {"content": "回答の一部..."}
 * data: {"done": true, "usage": {...}}
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // DEBUG: 開発環境では認証をスキップ
  const isDev = process.env.NODE_ENV === "development";

  try {
    logger.info(`[${requestId}] Stream request started (dev=${isDev})`);
    console.log(`[DEBUG ${requestId}] === STREAM REQUEST STARTED ===`);

    // 認証チェック（開発環境ではスキップ）
    let authResult;
    if (isDev) {
      console.log(`[DEBUG ${requestId}] Skipping auth in dev mode`);
      authResult = { user: { id: "dev-user" }, userId: "dev-user" };
    } else {
      authResult = await requireAuth(request);
    }

    if (authResult instanceof Response) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();
    logger.info(`[${requestId}] Request received`, {
      messageCount: body.messages?.length,
      provider: body.provider,
      toolOptions: body.toolOptions,
    });

    // バリデーション
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`);
      const errorIssues = validationResult.error.issues;
      console.error(`[DEBUG ${requestId}] Validation error:`, errorIssues);
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: errorIssues
            .map(
              (e: { path: (string | number)[]; message: string }) =>
                `${e.path.join(".")}: ${e.message}`,
            )
            .join(", "),
          details: validationResult.error.format(),
          requestId,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const {
      messages,
      provider: requestedProvider,
      temperature,
      maxTokens,
      toolOptions,
    } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return new Response(
          JSON.stringify({
            error: "Invalid provider",
            requestId,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider`, { provider, toolOptions });
    console.log(
      `[DEBUG ${requestId}] Provider: ${provider}, XAI_KEY exists: ${!!process.env.XAI_API_KEY}`,
    );

    // LangChainモデルの作成（ストリーミング有効）
    console.log(`[DEBUG ${requestId}] Creating LangChain model...`);
    const model = createLangChainModel(provider, {
      temperature,
      maxTokens,
      streaming: true,
    });
    console.log(`[DEBUG ${requestId}] Model created successfully`);

    // ストリーミング実行
    console.log(`[DEBUG ${requestId}] Starting streaming chat...`);
    const streamIterator = executeStreamingChat(model, messages as LLMMessage[]);
    console.log(`[DEBUG ${requestId}] Stream iterator created`);
    const stream = createSSEStream(streamIterator);
    console.log(`[DEBUG ${requestId}] SSE stream created, returning response`);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error(`[${requestId}] Error`, { error: errorMessage });
    console.error(`[DEBUG ${requestId}] ERROR:`, errorMessage);
    console.error(`[DEBUG ${requestId}] Stack:`, error instanceof Error ? error.stack : "No stack");

    return new Response(
      JSON.stringify({
        error: errorMessage,
        requestId,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
