/**
 * LLM Summarization API
 *
 * 会話履歴の要約をサーバーサイドで実行
 * ClientはこのAPIを経由して要約機能を利用
 *
 * POST /api/llm/summarize
 * Body: { messages: LLMMessage[], provider: LLMProvider }
 * Response: { summary: string }
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { GrokClient } from "@/lib/llm/clients/grok";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";

interface SummarizeRequest {
  messages: LLMMessage[];
  provider: LLMProvider;
}

interface SummarizeResponse {
  summary: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * POST /api/llm/summarize
 */
export async function POST(req: Request): Promise<NextResponse<SummarizeResponse | ErrorResponse>> {
  // 認証チェック
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const body = (await req.json()) as SummarizeRequest;
    const { messages, provider } = body;

    // バリデーション
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages: must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!provider || !provider.startsWith("grok-")) {
      return NextResponse.json(
        { error: "Invalid provider: must be a grok provider" },
        { status: 400 },
      );
    }

    // GrokClientをサーバーサイドでインスタンス化
    const client = new GrokClient(provider);
    const summary = await client.summarize(messages);

    return NextResponse.json<SummarizeResponse>({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    const message = error instanceof Error ? error.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
