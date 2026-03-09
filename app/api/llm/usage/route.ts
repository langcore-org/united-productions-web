/**
 * LLM Usage Tracking API（Supabase版）
 *
 * POST /api/llm/usage
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import type { LLMProvider } from "@/lib/llm/types";
import { trackUsage } from "@/lib/usage/tracker";

const usageSchema = z.object({
  provider: z.string(),
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    const validationResult = usageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "リクエストが無効です", details: validationResult.error.format() },
        { status: 400 },
      );
    }

    const { provider, inputTokens, outputTokens, metadata } = validationResult.data;

    await trackUsage({
      userId: authResult.user.id,
      provider: provider as LLMProvider,
      inputTokens,
      outputTokens,
      metadata: metadata as Record<string, unknown>,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Usage tracking error:", error);
    return NextResponse.json({ error: "使用量の記録に失敗しました" }, { status: 500 });
  }
}
