/**
 * フォローアップ質問生成API
 *
 * POST /api/llm/follow-up
 * AIレスポンスに対するフォローアップ質問を3つ生成する
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse, validationErrorResponse } from "@/lib/api/utils";
import { GrokClient } from "@/lib/llm/clients/grok";
import { getProviderInfo } from "@/lib/llm/config";

import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("FollowUpAPI");

const followUpRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export type FollowUpRequest = z.infer<typeof followUpRequestSchema>;

export interface FollowUpResponse {
  questions: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * フォローアップ生成用の最も安価なモデル
 * grok-4-1-fast-reasoning: $0.20/M input, $0.50/M output
 */
const FOLLOW_UP_PROVIDER: LLMProvider = "grok-4-1-fast-reasoning";

const FOLLOW_UP_SYSTEM_PROMPT = `あなたはテレビ制作業務支援AIのフォローアップ質問生成アシスタントです。

与えられた会話の文脈を理解し、ユーザーが次に実行しそうな具体的なアクションを3つ生成してください。

## 生成パターン（優先順）

1. **具体化・詳細化**
   - 「〜を具体的に」「〜を詳細に」「〜を表にまとめて」
   - 「〜の見積もりを」「〜の予算を」「〜のスケジュールを」

2. **アウトプット作成**
   - 「〜を企画書に」「〜をメールで」「〜をプレゼン資料に」
   - 「〜を印刷用に整形」「〜を議事録形式で」

3. **次のアクション**
   - 「〜を調べて」「〜の連絡先を」「〜の予約を」
   - 「〜の類似事例を」「〜のリスクを」

## 要件
- 15文字〜25文字程度の簡潔な文章
- 「〜して」「〜を〜して」など、実行を促す形態
- 会話の文脈に沿った具体的な内容
- 番号や記号は不要

## 出力形式
必ず以下のJSON形式で出力してください:
{
  "questions": [
    "質問1",
    "質問2", 
    "質問3"
  ]
}`;

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const isDev = process.env.NODE_ENV === "development";

  try {
    logger.info(`[${requestId}] Follow-up request started (dev=${isDev})`);

    // 認証チェック（開発環境ではスキップ）
    let authResult: { user: { id: string }; userId: string } | Response | null = null;
    if (isDev) {
      authResult = { user: { id: "dev-user" }, userId: "dev-user" };
    } else {
      authResult = await requireAuth(request);
    }

    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await request.json();

    const validationResult = followUpRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn(`[${requestId}] Validation failed`);
      return validationErrorResponse(validationResult.error);
    }

    const { messages } = validationResult.data;

    // フォローアップ生成には安価なモデルを使用
    const provider: LLMProvider = FOLLOW_UP_PROVIDER;
    const providerInfo = getProviderInfo(provider);

    logger.info(
      `[${requestId}] Using provider: ${provider} (${providerInfo.inputPrice}/${providerInfo.outputPrice} $/M tokens)`,
    );

    // フォローアップ生成用のメッセージを構築
    const followUpMessages: LLMMessage[] = [
      { role: "system", content: FOLLOW_UP_SYSTEM_PROMPT },
      ...messages,
      {
        role: "user",
        content: "上記の会話に基づいて、フォローアップ質問を3つ生成してください。",
      },
    ];

    const client = new GrokClient(provider);
    const response = await client.chat(followUpMessages);

    // JSONレスポンスをパース
    let questions: string[] = [];
    try {
      const parsed = JSON.parse(response.content) as { questions: string[] };
      if (Array.isArray(parsed.questions)) {
        questions = parsed.questions.slice(0, 3);
      }
    } catch {
      // JSONパース失敗時は、テキストから質問を抽出
      const lines = response.content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("{") && !line.startsWith("}"));
      questions = lines.slice(0, 3);
    }

    // フォールバック: 質問が取得できない場合はデフォルトを返す
    if (questions.length === 0) {
      questions = ["もっと詳しく教えて", "具体例を挙げて", "別の視点から教えて"];
    }

    const result: FollowUpResponse = {
      questions,
      usage: response.usage || { inputTokens: 0, outputTokens: 0, cost: 0 },
    };

    logger.info(`[${requestId}] Follow-up generated`, {
      questionCount: questions.length,
      usage: response.usage,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error(`[${requestId}] Error`, { error: errorMessage });

    return errorResponse(errorMessage, 500);
  }
}
