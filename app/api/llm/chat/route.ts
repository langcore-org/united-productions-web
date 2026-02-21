/**
 * LLM Chat API Route (LangChain版)
 * 
 * POST /api/llm/chat
 * 非同期チャット完了を行うエンドポイント
 * LangChainを使用して実装
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLangChainModel } from '@/lib/llm/langchain/factory';
import { executeChat } from '@/lib/llm/langchain/chains/base';
import { requireAuth } from '@/lib/api/auth';
import { isValidProvider } from '@/lib/llm/factory';
import { getDefaultLLMProvider } from '@/lib/settings/db';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { createClientLogger } from '@/lib/logger';
import { trackUsage } from '@/lib/usage/tracker';

const logger = createClientLogger('LangChainChatAPI');

/**
 * リクエストバリデーションスキーマ
 */
const chatRequestSchema = z.object({
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

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * POST /api/llm/chat
 * 
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "grok-4-1-fast-reasoning",
 *   "temperature": 0.7
 * }
 * 
 * Response:
 * {
 *   "content": "...",
 *   "usage": {"inputTokens": 100, "outputTokens": 50, "cost": 0.0001}
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[${requestId}] Chat API request started`);

    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.id;

    // リクエストボディのパース
    const body = await request.json();
    logger.info(`[${requestId}] Request received`, {
      messageCount: body.messages?.length,
      provider: body.provider,
    });

    // バリデーション
    const validationResult = chatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`);
      return NextResponse.json(
        {
          error: 'リクエストが無効です',
          details: validationResult.error.format(),
          requestId,
        },
        { status: 400 }
      );
    }

    const { messages, provider: requestedProvider, temperature, maxTokens } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return NextResponse.json(
          {
            error: '無効なプロバイダーです',
            message: `プロバイダー "${requestedProvider}" はサポートされていません`,
            requestId,
          },
          { status: 400 }
        );
      }
      provider = requestedProvider;
    } else {
      provider = await getDefaultLLMProvider();
    }

    logger.info(`[${requestId}] Using provider`, { provider });

    // LangChainモデルの作成
    const model = createLangChainModel(provider, {
      temperature,
      maxTokens,
      streaming: false,
    });

    // チャット実行
    const startTime = Date.now();
    const response = await executeChat(model, messages as LLMMessage[], provider);
    const duration = Date.now() - startTime;

    logger.info(`[${requestId}] Chat completed`, {
      duration,
      contentLength: response.content.length,
    });

    // usage記録（推定値）
    if (response.usage) {
      try {
        await trackUsage({
          userId,
          provider,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          metadata: {
            requestId,
            method: 'chat',
            duration,
          },
        });
      } catch (trackError) {
        logger.error(`[${requestId}] Failed to track usage`, { error: trackError });
      }
    }

    // レスポンスの返却
    return NextResponse.json({
      content: response.content,
      usage: response.usage,
      provider,
      requestId,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    logger.error(`[${requestId}] Unexpected error`, { error: errorMessage });
    
    return NextResponse.json(
      {
        error: '内部サーバーエラー',
        message: errorMessage,
        requestId,
      },
      { status: 500 }
    );
  }
}
