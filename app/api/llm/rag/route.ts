/**
 * RAG API Route
 * 
 * POST /api/llm/rag
 * Retrieval-Augmented Generationエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLangChainModel } from '@/lib/llm/langchain/factory';
import { executeRAG } from '@/lib/llm/langchain/rag';
import { requireAuth } from '@/lib/api/auth';
import { isValidProvider } from '@/lib/llm/factory';
import { DEFAULT_PROVIDER } from '@/lib/llm/config';
import type { LLMProvider } from '@/lib/llm/types';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('RAGAPI');

/**
 * リクエストバリデーションスキーマ
 */
const ragRequestSchema = z.object({
  documents: z.array(
    z.object({
      content: z.string().min(1),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1),
  question: z.string().min(1),
  provider: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topK: z.number().positive().optional(),
});

export type RAGRequest = z.infer<typeof ragRequestSchema>;

/**
 * POST /api/llm/rag
 * 
 * Request:
 * {
 *   "documents": [{"content": "...", "metadata": {}}],
 *   "question": "...",
 *   "provider": "gpt-4o-mini"
 * }
 * 
 * Response:
 * {
 *   "answer": "...",
 *   "sources": [0, 1, 2]
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[${requestId}] RAG request started`);

    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();
    logger.info(`[${requestId}] Request received`, {
      documentCount: body.documents?.length,
      question: body.question?.substring(0, 50),
    });

    // バリデーション
    const validationResult = ragRequestSchema.safeParse(body);
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

    const { documents, question, provider: requestedProvider, temperature, topK } = validationResult.data;

    // プロバイダーの決定
    let provider: LLMProvider;
    if (requestedProvider) {
      if (!isValidProvider(requestedProvider)) {
        return NextResponse.json(
          {
            error: '無効なプロバイダーです',
            requestId,
          },
          { status: 400 }
        );
      }
      provider = requestedProvider;
    } else {
      provider = DEFAULT_PROVIDER;
    }

    logger.info(`[${requestId}] Using provider`, { provider });

    // LangChainモデルの作成
    const model = createLangChainModel(provider, {
      temperature,
      streaming: false,
    });

    // RAG実行
    const startTime = Date.now();
    const { answer, sources } = await executeRAG(
      model,
      documents.map(d => d.content),
      question,
      { topK }
    );
    const duration = Date.now() - startTime;

    logger.info(`[${requestId}] RAG completed`, {
      duration,
      answerLength: answer.length,
      sourceCount: sources.length,
    });

    // レスポンスの返却
    return NextResponse.json({
      answer,
      sources,
      requestId,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    logger.error(`[${requestId}] Error`, { error: errorMessage });
    
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
