/**
 * Meeting Notes API Route
 * 
 * POST /api/meeting-notes
 * Zoom文字起こしテキストをAIで整形して議事録を生成
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GrokClient } from '@/lib/llm/clients/grok';
import { getSystemPrompt, MeetingTemplate } from '@/prompts/meeting-format';
import { createApiHandler } from '@/lib/api/handler';
import type { LLMMessage } from '@/lib/llm/types';

const meetingNotesRequestSchema = z.object({
  transcript: z.string().min(1, '文字起こしテキストを入力してください'),
  template: z.enum(['meeting', 'interview'] as const),
  provider: z.enum(['grok-4.1-fast', 'grok-4'] as const).optional(),
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
export const POST = createApiHandler(
  async ({ data }) => {
    const { transcript, template, provider: requestedProvider } = data;
    
    const provider = requestedProvider ?? 'grok-4.1-fast';
    const systemPrompt = getSystemPrompt(template as MeetingTemplate);
    const client = new GrokClient(provider);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下のZoom文字起こしテキストを整形してください：\n\n${transcript}` },
    ];

    const response = await client.chat(messages);

    return NextResponse.json({
      content: response.content,
      usage: response.usage ?? null,
    });
  },
  { schema: meetingNotesRequestSchema }
);
