/**
 * LLM Stream API Route
 * 
 * POST /api/llm/stream
 * Server-Sent Events形式でストリーミングレスポンスを返すエンドポイント
 * レート制限対応（キャッシュはストリーミングには適用しない）
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createLLMClient, createGrokClientWithTools, isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import { requireAuth } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import { trackUsage } from '@/lib/usage/tracker';
import { GrokClient } from '@/lib/llm/clients/grok';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

/**
 * ツールオプションの型
 */
interface ToolOptions {
  enableWebSearch?: boolean;
}

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
  toolOptions: z.object({
    enableWebSearch: z.boolean().optional(),
  }).optional(),
});

export type StreamRequest = z.infer<typeof streamRequestSchema>;

/**
 * SSE形式のストリームレスポンスを作成
 * usage情報も最後に送信
 */
function createStreamResponse(
  iterator: AsyncIterable<{ 
    chunk?: string; 
    usage?: { inputTokens: number; outputTokens: number; cost: number };
    toolCall?: { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed' };
    toolUsage?: { web_search_calls?: number; x_search_calls?: number; code_interpreter_calls?: number; file_search_calls?: number; mcp_calls?: number; document_search_calls?: number };
    reasoning?: { step: number; content: string; tokens?: number };
  }>,
  requestId: string,
  provider: LLMProvider,
  userId: string,
  toolOptions?: ToolOptions
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        logger.info(`[${requestId}] Starting stream`);
        
        let finalUsage: { inputTokens: number; outputTokens: number; cost: number } | undefined;
        
        for await (const { chunk, usage, toolCall, toolUsage, reasoning } of iterator) {
          if (chunk) {
            // SSE形式でデータを送信
            const data = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // ツール呼び出し情報を転送
          if (toolCall) {
            const data = JSON.stringify({ toolCall });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // 思考ステップを転送
          if (reasoning) {
            const data = JSON.stringify({ reasoning });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // ツール使用状況を転送
          if (toolUsage) {
            const data = JSON.stringify({ toolUsage });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          
          // usage情報を記録
          if (usage) {
            finalUsage = usage;
            
            // 使用量をDBに記録
            try {
              await trackUsage({
                userId,
                provider,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                metadata: { 
                  requestId, 
                  method: "stream",
                  inputCost: usage.cost * (usage.inputTokens / (usage.inputTokens + usage.outputTokens)),
                  outputCost: usage.cost * (usage.outputTokens / (usage.inputTokens + usage.outputTokens)),
                  // 2026-02-20: ツール使用情報を記録（全ツール常時有効）
                  tools: {
                    webSearch: toolOptions?.enableWebSearch ?? false,
                    xSearch: true,
                    codeExecution: true,
                    fileSearch: true,
                  },
                },
              });
              
              logger.info(`[${requestId}] Usage tracked`, {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cost: usage.cost,
              });
            } catch (trackError) {
              logger.error(`[${requestId}] Failed to track usage`, { error: trackError });
            }
          }
        }

        // ストリーム終了を通知（usage情報を含む）
        const doneData = JSON.stringify({ 
          done: true,
          usage: finalUsage,
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
        
        logger.info(`[${requestId}] Stream completed`, { hasUsage: !!finalUsage });
      } catch (error) {
        // エラーをSSE形式で送信
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error(`[${requestId}] Stream error`, { 
          error: errorMessage,
          stack: errorStack,
          requestId,
        });
        
        const data = JSON.stringify({ 
          error: errorMessage,
          debug: { requestId },
        });
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
 *   "provider": "grok-4-1-fast-reasoning" // オプション
 * }
 * 
 * Response: Server-Sent Events
 * data: {"content": "Hello"}
 * data: {"content": " world"}
 * data: {"done": true, "usage": {"inputTokens": 10, "outputTokens": 20, "cost": 0.0001}}
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // デバッグ: 環境変数確認
  logger.info(`[${requestId}] Debug: Environment check`, {
    geminiKeyExists: !!process.env.GEMINI_API_KEY,
    geminiKeyPrefix: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'none',
    nodeEnv: process.env.NODE_ENV,
  });
  
  try {
    // 認証チェック（セッションのみ検証、レスポンスは返さない）
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logger.warn(`[${requestId}] Authentication failed`);
      return authResult;
    }

    const userId = authResult.user.id;

    // リクエストボディのパース
    let body: unknown;
    try {
      body = await request.json();
      logger.info(`[${requestId}] Request received`, {
        provider: (body as { provider?: string }).provider,
        messageCount: (body as { messages?: unknown[] }).messages?.length,
      });
    } catch (error) {
      logger.error(`[${requestId}] Failed to parse request body`, { error });
      return new Response(
        JSON.stringify({
          error: 'リクエストボディの解析に失敗しました',
          requestId,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // バリデーション
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`, {
        errors: validationResult.error.format(),
      });
      return new Response(
        JSON.stringify({
          error: 'リクエストが無効です',
          details: validationResult.error.format(),
          requestId,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { messages, provider: requestedProvider, toolOptions } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        logger.warn(`[${requestId}] Invalid provider`, { provider: requestedProvider });
        return new Response(
          JSON.stringify({
            error: '無効なプロバイダーです',
            message: `プロバイダー "${requestedProvider}" はサポートされていません`,
            requestId,
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

    logger.info(`[${requestId}] Using provider`, { provider });

    // LLMクライアントの作成
    let client;
    try {
      // Grokの場合はツールオプションを渡す
      if (provider.startsWith('grok-')) {
        client = createGrokClientWithTools(provider, {
          enableWebSearch: toolOptions?.enableWebSearch,
        });
      } else {
        client = createLLMClient(provider);
      }
      logger.info(`[${requestId}] LLM client created`, { 
        provider, 
        tools: toolOptions 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[${requestId}] Failed to create LLM client`, { error: errorMessage });
      return new Response(
        JSON.stringify({
          error: 'LLMクライアントの作成に失敗しました',
          message: errorMessage,
          requestId,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // ストリーミングレスポンスの取得（usage付き）
    try {
      // Grokクライアントの場合はstreamWithUsageを使用
      if (client instanceof GrokClient) {
        const streamIterator = client.streamWithUsage(messages as LLMMessage[]);
        return createStreamResponse(streamIterator, requestId, provider, userId, toolOptions);
      } else {
        // 他のプロバイダーの場合は従来のstreamを使用（usageは記録されない）
        const streamIterator = client.stream(messages as LLMMessage[]);
        // 従来のstreamを新しい形式に変換
        const wrappedIterator = async function* () {
          for await (const chunk of streamIterator) {
            yield { chunk };
          }
        }();
        return createStreamResponse(wrappedIterator, requestId, provider, userId, toolOptions);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[${requestId}] Failed to create stream`, { error: errorMessage });
      return new Response(
        JSON.stringify({
          error: 'ストリームの作成に失敗しました',
          message: errorMessage,
          requestId,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    logger.error(`[${requestId}] Unexpected error`, { error: errorMessage });
    
    return new Response(
      JSON.stringify({
        error: '内部サーバーエラー',
        message: errorMessage,
        requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
