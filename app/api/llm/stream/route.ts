/**
 * LLM Stream API Route
 * 
 * POST /api/llm/stream
 * Server-Sent Events形式でストリーミングレスポンスを返すエンドポイント
 * レート制限対応（キャッシュはストリーミングには適用しない）
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createLLMClient, isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

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
});

export type StreamRequest = z.infer<typeof streamRequestSchema>;

/**
 * SSE形式のストリームレスポンスを作成
 */
function createStreamResponse(iterator: AsyncIterable<string>): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of iterator) {
          // SSE形式でデータを送信
          const data = JSON.stringify({ content: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // ストリーム終了を通知
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        // エラーをSSE形式で送信
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const data = JSON.stringify({ error: errorMessage });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * POST /api/llm/stream
 * 
 * Request:
 * {
 *   "messages": [{"role": "user", "content": "..."}],
 *   "provider": "gemini-2.5-flash-lite" // オプション
 * }
 * 
 * Response: Server-Sent Events
 * data: {"content": "Hello"}
 * data: {"content": " world"}
 * data: [DONE]
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // リクエストボディのパース
    const body = await request.json();

    // バリデーション
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { messages, provider: requestedProvider } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid provider',
            message: `Provider "${requestedProvider}" is not supported`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    // LLMクライアントの作成
    const client = createLLMClient(provider);

    // ストリーミングレスポンスの取得
    const streamIterator = client.stream(messages as LLMMessage[]);

    // SSE形式でストリームを返却
    return createStreamResponse(streamIterator);

  } catch (error) {
    console.error('LLM Stream API Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    // NotImplementedClientのエラー（Wave 2で実装予定）
    if (errorMessage.includes('not implemented yet')) {
      return new Response(
        JSON.stringify({
          error: 'Provider not implemented',
          message: errorMessage,
        }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // その他のエラー
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
