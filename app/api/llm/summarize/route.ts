/**
 * LLM Summarization API
 *
 * 会話履歴の要約をサーバーサイドで実行
 * ClientはこのAPIを経由して要約機能を利用
 *
 * POST /api/llm/summarize
 * Body: {
 *   messages: LLMMessage[],
 *   provider: LLMProvider,
 *   targetTokens?: number,
 *   existingSummary?: string
 * }
 * Response: { summary: string }
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { GrokClient } from "@/lib/llm/clients/grok";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";

interface SummarizeRequest {
  messages: LLMMessage[];
  provider: LLMProvider;
  targetTokens?: number;
  existingSummary?: string;
}

interface SummarizeResponse {
  summary: string;
}

interface ErrorResponse {
  error: string;
}

/**
 * 要約用プロンプトを構築
 */
function buildSummaryPrompt(
  messages: LLMMessage[],
  targetChars: number,
  existingSummary?: string,
): string {
  const conversation = messages
    .map((m) => `${m.role}: ${m.content.substring(0, 500)}`)
    .join("\n");

  const summaryContext = existingSummary
    ? `【これまでの要約】\n${existingSummary}\n\n`
    : "";

  return `
以下の会話を${targetChars}文字以内で要約してください。
重要な事実、結論、未解決事項を優先して含めてください。

${summaryContext}【会話】
${conversation}

【新しい要約】（${targetChars}文字以内）
`.trim();
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
    const { messages, provider, targetTokens, existingSummary } = body;

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

    // 目標文字数を計算
    const targetChars = targetTokens ? Math.floor(targetTokens / 0.25) : undefined;

    // プロンプトを構築
    const prompt = buildSummaryPrompt(messages, targetChars ?? 2000, existingSummary);

    // GrokClientをサーバーサイドでインスタンス化
    const client = new GrokClient(provider);
    const summary = await client.summarizeWithPrompt(prompt);

    return NextResponse.json<SummarizeResponse>({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    const message = error instanceof Error ? error.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
