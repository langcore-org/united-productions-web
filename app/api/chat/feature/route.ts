/**
 * Feature Chat API Route
 *
 * GET /api/chat/feature?featureId=xxx
 * POST /api/chat/feature
 *
 * 各機能ページ用のチャットAPI
 * - 会話履歴の取得・保存
 * - ストリーミングレスポンス
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import {
  RESEARCH_CAST_SYSTEM_PROMPT,
} from "@/lib/prompts/research-cast";
import {
  RESEARCH_LOCATION_SYSTEM_PROMPT,
} from "@/lib/prompts/research-location";
import {
  RESEARCH_INFO_SYSTEM_PROMPT,
} from "@/lib/prompts/research-info";
import {
  RESEARCH_EVIDENCE_SYSTEM_PROMPT,
} from "@/lib/prompts/research-evidence";
import { MINUTES_SYSTEM_PROMPT } from "@/lib/prompts/minutes";
import { getProposalSystemPrompt } from "@/lib/prompts/proposal";
import { TRANSCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/transcript";
import { NA_SCRIPT_SYSTEM_PROMPT } from "@/lib/prompts/na-script";

/**
 * 機能IDからシステムプロンプトを取得
 */
async function getSystemPrompt(
  featureId: string,
  userId: string
): Promise<string> {
  switch (featureId) {
    case "research-cast":
      return RESEARCH_CAST_SYSTEM_PROMPT;
    case "research-location":
      return RESEARCH_LOCATION_SYSTEM_PROMPT;
    case "research-info":
      return RESEARCH_INFO_SYSTEM_PROMPT;
    case "research-evidence":
      return RESEARCH_EVIDENCE_SYSTEM_PROMPT;
    case "minutes":
      return MINUTES_SYSTEM_PROMPT;
    case "proposal": {
      // 番組設定を取得して動的にプロンプト生成
      const settings = await (prisma as unknown as { programSettings: { findUnique: (args: unknown) => Promise<{ programInfo: string; pastProposals: string } | null> } }).programSettings.findUnique({
        where: { userId },
      });
      return getProposalSystemPrompt(
        settings?.programInfo || "",
        settings?.pastProposals || ""
      );
    }
    case "transcript":
      return TRANSCRIPT_SYSTEM_PROMPT;
    case "transcript-na":
      return NA_SCRIPT_SYSTEM_PROMPT;
    default:
      throw new Error(`Unknown featureId: ${featureId}`);
  }
}

/**
 * GET /api/chat/feature?featureId=xxx
 * 会話履歴を取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get("featureId");

    if (!featureId) {
      return new Response(
        JSON.stringify({ error: "featureId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ResearchChatテーブルから履歴を取得
    const chat = await prisma.researchChat.findFirst({
      where: {
        userId,
        agentType: featureId.toUpperCase(),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!chat) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = chat.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase(),
      content: m.content,
      timestamp: m.createdAt,
      llmProvider: chat.llmProvider,
    }));

    return new Response(JSON.stringify({ messages }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get conversation`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to get conversation", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/chat/feature
 * 会話履歴を保存
 */
const saveRequestSchema = z.object({
  featureId: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      timestamp: z.string().or(z.date()),
      llmProvider: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validationResult = saveRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { featureId, messages } = validationResult.data;

    // 既存のチャットを検索
    let chat = await prisma.researchChat.findFirst({
      where: {
        userId,
        agentType: featureId.toUpperCase(),
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!chat) {
      // 新規作成
      chat = await prisma.researchChat.create({
        data: {
          userId,
          agentType: featureId.toUpperCase(),
          llmProvider: "GEMINI_25_FLASH_LITE",
        },
      });
    }

    // 最新のメッセージを保存（最新2件のみ）
    const latestMessages = messages.slice(-2);
    for (const msg of latestMessages) {
      await prisma.researchMessage.create({
        data: {
          chatId: chat.id,
          role: msg.role.toUpperCase(),
          content: msg.content,
        },
      });
    }

    // チャットの更新日時を更新
    await prisma.researchChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save conversation`, {
      error: errorMessage,
    });
    return new Response(
      JSON.stringify({ error: "Failed to save conversation", requestId }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
