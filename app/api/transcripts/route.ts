/**
 * Transcripts API Route
 * 
 * POST /api/transcripts
 * Premiere Pro書き起こしテキストをNA原稿用に整形
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GrokClient } from '@/lib/llm/clients/grok';
import { resolveProvider } from '@/lib/llm/utils';
import { getPromptFromDB, PROMPT_KEYS } from '@/lib/prompts/db';
import { createUserPrompt } from '@/prompts/transcript-format';
import { createApiHandler } from '@/lib/api/handler';
import type { LLMMessage } from '@/lib/llm/types';

const transcriptRequestSchema = z.object({
  transcript: z.string().min(1, '書き起こしテキストを入力してください'),
  provider: z.string().optional(), // デフォルトは resolveProvider() を使用
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
export const POST = createApiHandler(
  async ({ data }) => {
    const { transcript, provider: requestedProvider } = data;
    
    const provider = resolveProvider(requestedProvider, 'PJ-B');
    
    // DBからプロンプトを取得
    const systemPrompt = await getPromptFromDB(PROMPT_KEYS.TRANSCRIPT_FORMAT);
    if (!systemPrompt) {
      throw new Error('System prompt not found');
    }
    
    const client = new GrokClient(provider);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: createUserPrompt(transcript) },
    ];

    const response = await client.chat(messages);

    return NextResponse.json({
      content: response.content,
      usage: response.usage ?? null,
    });
  },
  { schema: transcriptRequestSchema }
);
