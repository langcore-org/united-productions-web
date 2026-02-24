/**
 * Program Settings API Route
 *
 * GET /api/settings/program
 * POST /api/settings/program
 *
 * 番組情報・過去企画の設定を管理
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings/program
 * 現在の設定を取得
 */
export async function GET(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult;
    }
    const userId = authResult.user.id;

    const settings = await (
      prisma as unknown as {
        programSettings: {
          findUnique: (
            args: unknown,
          ) => Promise<{ programInfo: string; pastProposals: string; updatedAt: Date } | null>;
        };
      }
    ).programSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return new Response(JSON.stringify({ programInfo: "", pastProposals: "" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        programInfo: settings.programInfo,
        pastProposals: settings.pastProposals,
        updatedAt: settings.updatedAt,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to get program settings`, {
      error: errorMessage,
    });
    return new Response(JSON.stringify({ error: "Failed to get settings", requestId }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/settings/program
 * 設定を保存
 */
const saveSettingsSchema = z.object({
  programInfo: z.string(),
  pastProposals: z.string(),
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
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = saveSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { programInfo, pastProposals } = validationResult.data;

    // upsertで保存
    const settings = await (
      prisma as unknown as {
        programSettings: {
          upsert: (
            args: unknown,
          ) => Promise<{ programInfo: string; pastProposals: string; updatedAt: Date }>;
        };
      }
    ).programSettings.upsert({
      where: { userId },
      update: {
        programInfo,
        pastProposals,
      },
      create: {
        userId,
        programInfo,
        pastProposals,
      },
    });

    logger.info(`[${requestId}] Program settings saved`, { userId });

    return new Response(
      JSON.stringify({
        success: true,
        programInfo: settings.programInfo,
        pastProposals: settings.pastProposals,
        updatedAt: settings.updatedAt,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[${requestId}] Failed to save program settings`, {
      error: errorMessage,
    });
    return new Response(JSON.stringify({ error: "Failed to save settings", requestId }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
