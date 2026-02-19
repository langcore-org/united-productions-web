/**
 * Research API Route
 *
 * PJ-C リサーチ・考査機能のAPIエンドポイント
 * - 人探しエージェント (Grok 4.1 Fast)
 * - エビデンス確認エージェント (Perplexity Sonar)
 * - ロケ地探しエージェント (Perplexity Sonar)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLLMClient } from "@/lib/llm/factory";
import { createApiHandler, createStreamingResponse } from "@/lib/api/handler";
import { LLMProvider, LLMMessage } from "@/lib/llm/types";
import { ResearchAgentType, ResearchResponse } from "@/types/research";
import { AGENT_DEFAULT_PROVIDERS, AGENT_SYSTEM_PROMPTS } from "@/lib/research/prompts";

const researchRequestSchema = z.object({
  agentType: z.enum(["people", "evidence", "location"] as const),
  query: z.string().min(1, "クエリを入力してください"),
  provider: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

export type { ResearchAgentType };
export type { ResearchResponse };

/**
 * POST /api/research
 * リサーチリクエストを処理
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const { agentType, query, provider, stream = false } = data;

    const selectedProvider = provider || AGENT_DEFAULT_PROVIDERS[agentType as ResearchAgentType];
    const client = createLLMClient(selectedProvider);

    const messages: LLMMessage[] = [
      { role: "system", content: AGENT_SYSTEM_PROMPTS[agentType as ResearchAgentType] },
      { role: "user", content: query },
    ];

    // ストリーミングレスポンス
    if (stream) {
      return createStreamingResponse(client.stream(messages));
    }

    // 通常レスポンス
    const response = await client.chat(messages);

    // citations抽出（Perplexityの場合）
    let citations: string[] | undefined;
    if (selectedProvider.startsWith("perplexity")) {
      const citationMatch = response.content.match(/\*\*Sources:\*\*\n((?:\[\d+\] [^\n]+\n?)+)/);
      if (citationMatch) {
        citations = citationMatch[1]
          .trim()
          .split("\n")
          .map((line) => line.replace(/^\[\d+\]\s*/, ""));
        response.content = response.content.replace(/\n\n---\n\n\*\*Sources:\*\*[\s\S]*/, "");
      }
    }

    const result: ResearchResponse = {
      content: response.content,
      usage: response.usage,
      citations,
    };

    return NextResponse.json(result);
  },
  { schema: researchRequestSchema }
);
