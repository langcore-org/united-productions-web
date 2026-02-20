/**
 * LLM Usage Tracking API
 * 
 * POST /api/llm/usage
 * フロントエンドから使用量を記録
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackUsage } from '@/lib/usage/tracker';
import { requireAuth } from '@/lib/api/auth';
import type { LLMProvider } from '@/lib/llm/types';

const usageSchema = z.object({
  provider: z.string(),
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  metadata: z.object({}).passthrough().optional(),
});

/**
 * POST /api/llm/usage
 * 使用量を記録
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    // バリデーション
    const validationResult = usageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'リクエストが無効です',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { provider, inputTokens, outputTokens, metadata } = validationResult.data;

    // 使用量を記録
    await trackUsage({
      userId: authResult.user.id,
      provider: provider as LLMProvider,
      inputTokens,
      outputTokens,
      metadata,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Usage tracking error:', error);
    return NextResponse.json(
      { error: '使用量の記録に失敗しました' },
      { status: 500 }
    );
  }
}
