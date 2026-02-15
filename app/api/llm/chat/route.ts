/**
 * LLM Chat API Route
 * 
 * POST /api/llm/chat
 * 非同期チャット完了を行うエンドポイント
 * キャッシュとレート制限対応
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLLMClient, isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import { getCachedLLMResponse, cacheLLMResponse } from '@/lib/llm/cache';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

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
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * POST /api/llm/chat
 * 
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "gemini-2.5-flash-lite" // オプション
 * }
 * 
 * Response:
 * {
 *   "content": "...",
 *   "thinking": "...",
 *   "usage": {"inputTokens": 100, "outputTokens": 50, "cost": 0.0001}
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディのパース
    const body = await request.json();

    // バリデーション
    const validationResult = chatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { messages, provider: requestedProvider } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return NextResponse.json(
          {
            error: 'Invalid provider',
            message: `Provider "${requestedProvider}" is not supported`,
          },
          { status: 400 }
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    // キャッシュをチェック
    const cachedResponse = await getCachedLLMResponse(messages as LLMMessage[], provider);
    if (cachedResponse) {
      // キャッシュヒット時はキャッシュから返却
      return NextResponse.json({
        content: cachedResponse.content,
        thinking: cachedResponse.thinking ?? null,
        usage: cachedResponse.usage ?? null,
        cached: true,
        cachedAt: new Date().toISOString(),
      });
    }

    // LLMクライアントの作成
    const client = createLLMClient(provider);

    // チャット完了の実行
    const response = await client.chat(messages as LLMMessage[]);

    // レスポンスをキャッシュに保存
    await cacheLLMResponse(messages as LLMMessage[], provider, response);

    // レスポンスの返却
    return NextResponse.json({
      content: response.content,
      thinking: response.thinking ?? null,
      usage: response.usage ?? null,
      cached: false,
    });

  } catch (error) {
    console.error('LLM Chat API Error:', error);

    // エラーの種類に応じたレスポンス
    if (error instanceof Error) {
      // NotImplementedClientのエラー（Wave 2で実装予定）
      if (error.message.includes('not implemented yet')) {
        return NextResponse.json(
          {
            error: 'Provider not implemented',
            message: error.message,
          },
          { status: 501 }
        );
      }

      // その他のエラー
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 不明なエラー
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
