/**
 * Meeting Notes API Route
 * 
 * POST /api/meeting-notes
 * Zoom文字起こしテキストをAIで整形して議事録を生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGeminiClient } from '@/lib/llm/clients/gemini';
import { getSystemPrompt, MeetingTemplate } from '@/prompts/meeting-format';
import { requireAuth } from '@/lib/api/auth';
import { handleApiError } from '@/lib/api/utils';
import type { LLMMessage } from '@/lib/llm/types';

/**
 * リクエストバリデーションスキーマ
 */
const meetingNotesRequestSchema = z.object({
  transcript: z.string().min(1, '文字起こしテキストを入力してください'),
  template: z.enum(['meeting', 'interview'] as const),
  provider: z.enum(['gemini-2.5-flash-lite', 'gemini-3.0-flash'] as const).optional(),
});

export type MeetingNotesRequest = z.infer<typeof meetingNotesRequestSchema>;

export interface MeetingNotesResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

/**
 * POST /api/meeting-notes
 * 
 * Request:
 * {
 *   "transcript": "Zoom文字起こしテキスト...",
 *   "template": "meeting" | "interview",
 *   "provider": "gemini-2.5-flash-lite" // オプション
 * }
 * 
 * Response:
 * {
 *   "content": "整形された議事録（Markdown）",
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
    const validationResult = meetingNotesRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'リクエストが無効です',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { transcript, template, provider: requestedProvider } = validationResult.data;

    // プロバイダーの決定（デフォルト: gemini-2.5-flash-lite）
    const provider = requestedProvider ?? 'gemini-2.5-flash-lite';

    // システムプロンプトの取得
    const systemPrompt = getSystemPrompt(template as MeetingTemplate);

    // LLMクライアントの作成
    const client = createGeminiClient(provider);

    // メッセージの構築
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下のZoom文字起こしテキストを整形してください：\n\n${transcript}` },
    ];

    // チャット完了の実行
    const response = await client.chat(messages);

    // レスポンスの返却
    return NextResponse.json({
      content: response.content,
      usage: response.usage ?? null,
    });

  } catch (error) {
    console.error('Meeting Notes API Error:', error);
    return handleApiError(error);
  }
}
