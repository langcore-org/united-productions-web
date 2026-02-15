/**
 * Research API Route
 *
 * PJ-C リサーチ・考査機能のAPIエンドポイント
 * - 人探しエージェント (Grok 4.1 Fast)
 * - エビデンス確認エージェント (Perplexity Sonar)
 * - ロケ地探しエージェント (Perplexity Sonar)
 */

import { NextRequest, NextResponse } from "next/server";
import { createLLMClient } from "@/lib/llm/factory";
import { LLMProvider, LLMMessage } from "@/lib/llm/types";

export type ResearchAgentType = "people" | "evidence" | "location";

export interface ResearchRequest {
  agentType: ResearchAgentType;
  query: string;
  provider?: LLMProvider;
  stream?: boolean;
}

export interface ResearchResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  citations?: string[];
}

// エージェント別デフォルトプロバイダー
const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-4.1-fast",
  evidence: "perplexity-sonar",
  location: "perplexity-sonar",
};

// エージェント別システムプロンプト
const AGENT_SYSTEM_PROMPTS: Record<ResearchAgentType, string> = {
  people: `あなたはテレビ制作の人探しエージェントです。
X（Twitter）検索を活用して、依頼された人物を特定してください。

【出力形式】
- 候補者を30人程度リストアップ
- 表形式で出力（名前、年齢、職業、所在地、SNSアカウント、該当理由）
- 各候補に信頼度スコア（1-10）を付与

【注意事項】
- プライバシーに配慮し、公開情報のみを使用
- 複数の情報源を交差検証
- 不確かな情報は「不明」と明記`,

  evidence: `あなたはテレビ制作のエビデンス確認エージェントです。
依頼された事実について、信頼できる情報源を用いて検証してください。

【出力形式】
1. 結論（はい/いいえ/部分的に正しい）
2. 詳細な説明
3. エビデンスURL一覧（出典明記）
4. 信頼度評価（高/中/低）と理由

【注意事項】
- 一次情報を優先
- 複数の独立した情報源を提示
- 不確実な情報は明確に区別`,

  location: `あなたはテレビ制作のロケ地探しエージェントです。
依頼された条件に合うロケ地を提案してください。

【出力形式】
- 候補地を10-15カ所列挙
- 表形式で出力（場所名、住所、アクセス、特徴、使用実績、連絡先）
- 各候補に撮影適性スコア（1-10）を付与

【注意事項】
- 撮影許可の有無を確認
- 季節や時間帯の注意点を記載
- 類似ロケの実績があれば言及`,
};

/**
 * POST /api/research
 * リサーチリクエストを処理
 */
export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { agentType, query, provider, stream = false } = body;

    // バリデーション
    if (!agentType || !query) {
      return NextResponse.json(
        { error: "agentType and query are required" },
        { status: 400 }
      );
    }

    if (!["people", "evidence", "location"].includes(agentType)) {
      return NextResponse.json(
        { error: "Invalid agentType. Must be 'people', 'evidence', or 'location'" },
        { status: 400 }
      );
    }

    // プロバイダー決定
    const selectedProvider = provider || AGENT_DEFAULT_PROVIDERS[agentType];

    // LLMクライアント作成
    const client = createLLMClient(selectedProvider);

    // メッセージ構築
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: AGENT_SYSTEM_PROMPTS[agentType],
      },
      {
        role: "user",
        content: query,
      },
    ];

    // ストリーミングレスポンス
    if (stream) {
      const encoder = new TextEncoder();
      const streamIterator = client.stream(messages);

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamIterator) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
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
        // 本文からSourcesセクションを削除
        response.content = response.content.replace(/\n\n---\n\n\*\*Sources:\*\*[\s\S]*/, "");
      }
    }

    const result: ResearchResponse = {
      content: response.content,
      usage: response.usage,
      citations,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Research API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
