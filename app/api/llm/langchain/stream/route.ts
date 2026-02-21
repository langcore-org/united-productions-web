/**
 * LangChain版 ストリーミング API Route
 * 
 * POST /api/llm/langchain/stream
 * LangChainを使用したストリーミングレスポンス
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createLangChainModel } from '@/lib/llm/langchain/factory';
import { executeStreamingChat, createSSEStream } from '@/lib/llm/langchain/chains/streaming';
import { requireAuth } from '@/lib/api/auth';
import { isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('LangChainStreamAPI');

/**
 * リクエストバリデーションスキーマ
 */
const streamRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
    })
  ).min(1),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export type LangChainStreamRequest = z.infer<typeof streamRequestSchema>;

/**
 * POST /api/llm/langchain/stream
 * 
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "grok-4-1-fast-reasoning",
 *   "temperature": 0.7
 * }
 * 
 * Response: Server-Sent Events
 * data: {"content": "Hello"}
 * data: {"content": " world"}
 * data: {"done": true, "usage": {...}}
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `lcs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[${requestId}] LangChain stream request started`);

    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();
    logger.info(`[${requestId}] Request received`, {
      messageCount: body.messages?.length,
      provider: body.provider,
    });

    // バリデーション
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`);
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: validationResult.error.format(),
          requestId,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, provider: requestedProvider, temperature, maxTokens } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid provider',
            requestId,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider`, { provider });

    // LangChainモデルの作成（ストリーミング有効）
    const model = createLangChainModel(provider, {
      temperature,
      maxTokens,
      streaming: true,
    });

    // ストリーミング実行
    const streamIterator = executeStreamingChat(model, messages as LLMMessage[]);
    const stream = createSSEStream(streamIterator);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error(`[${requestId}] Error`, { error: errorMessage });
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        requestId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
