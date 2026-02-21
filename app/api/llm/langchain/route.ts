/**
 * LangChain版 LLM API Route
 * 
 * POST /api/llm/langchain
 * LangChainを使用したチャット完了エンドポイント
 * 
 * 既存の /api/llm/chat と並行して動作
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLangChainModel } from '@/lib/llm/langchain/factory';
import { executeChat } from '@/lib/llm/langchain/chains/base';
import { requireAuth } from '@/lib/api/auth';
import { isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('LangChainAPI');

/**
 * リクエストバリデーションスキーマ
 */
const langchainRequestSchema = z.object({
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

export type LangChainRequest = z.infer<typeof langchainRequestSchema>;

/**
 * POST /api/llm/langchain
 * 
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "gpt-4o-mini", // オプション
 *   "temperature": 0.7 // オプション
 * }
 * 
 * Response:
 * {
 *   "content": "...",
 *   "usage": {"inputTokens": 100, "outputTokens": 50, "cost": 0.0001}
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `lc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[${requestId}] LangChain API request started`);

    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();
    logger.info(`[${requestId}] Request body received`, {
      messageCount: body.messages?.length,
      provider: body.provider,
    });

    // バリデーション
    const validationResult = langchainRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`, {
        errors: validationResult.error.format(),
      });
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
        logger.warn(`[${requestId}] Invalid provider`, { provider: requestedProvider });
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
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider`, { provider, temperature, maxTokens });

    // LangChainモデルの作成
    let model;
    try {
      model = createLangChainModel(provider, {
        temperature,
        maxTokens,
        streaming: false,
      });
      logger.info(`[${requestId}] LangChain model created`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[${requestId}] Failed to create LangChain model`, { error: errorMessage });
      return NextResponse.json(
        {
          error: 'モデルの作成に失敗しました',
          message: errorMessage,
          requestId,
        },
        { status: 500 }
      );
    }

    // チャット実行
    try {
      const startTime = Date.now();
      const response = await executeChat(model, messages as LLMMessage[], provider);
      const duration = Date.now() - startTime;

      logger.info(`[${requestId}] Chat completed`, {
        duration,
        contentLength: response.content.length,
      });

      // レスポンスの返却
      return NextResponse.json({
        content: response.content,
        usage: response.usage,
        provider,
        requestId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[${requestId}] Chat execution failed`, { error: errorMessage });
      return NextResponse.json(
        {
          error: 'チャットの実行に失敗しました',
          message: errorMessage,
          requestId,
        },
        { status: 500 }
      );
    }

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
