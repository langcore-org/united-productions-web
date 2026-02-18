/**
 * Transcripts API Route
 * 
 * POST /api/transcripts
 * Premiere Pro書き起こしテキストをNA原稿用に整形
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGeminiClient } from '@/lib/llm/clients/gemini';
import { getTranscriptSystemPrompt, createUserPrompt } from '@/prompts/transcript-format';
import { requireAuth } from '@/lib/api/auth';
import { handleApiError } from '@/lib/api/utils';
import type { LLMMessage } from '@/lib/llm/types';

/**
 * リクエストバリデーションスキーマ
 */
const transcriptRequestSchema = z.object({
  transcript: z.string().min(1, '書き起こしテキストを入力してください'),
  provider: z.enum(['gemini-2.5-flash-lite', 'gemini-3.0-flash'] as const).optional(),
});

export type TranscriptRequest = z.infer<typeof transcriptRequestSchema>;

export interface TranscriptResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

/**
 * POST /api/transcripts
 * 
 * Request:
 * {
 *   "transcript": "Premiere Pro書き起こしテキスト...",
 *   "provider": "gemini-2.5-flash-lite" // オプション
 * }
 * 
 * Response:
 * {
 *   "content": "整形されたNA原稿（Markdown）",
 *   "usage": {"inputTokens": 1000, "outputTokens": 500, "cost": 0.000225}
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // リクエストボディのパース
    const body = await request.json();

    // バリデーション
    const validationResult = transcriptRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'リクエストが無効です',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { transcript, provider: requestedProvider } = validationResult.data;

    // プロバイダーの決定（デフォルト: gemini-2.5-flash-lite）
    const provider = requestedProvider ?? 'gemini-2.5-flash-lite';

    // システムプロンプトの取得
    const systemPrompt = getTranscriptSystemPrompt();

    // LLMクライアントの作成
    const client = createGeminiClient(provider);

    // メッセージの構築
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: createUserPrompt(transcript) },
    ];

    // チャット完了の実行
    const response = await client.chat(messages);

    // レスポンスの返却
    return NextResponse.json({
      content: response.content,
      usage: response.usage ?? null,
    });

  } catch (error) {
    console.error('Transcript API Error:', error);
    return handleApiError(error);
  }
}
