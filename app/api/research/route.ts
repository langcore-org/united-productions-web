/**
 * リサーチAPI
 *
 * POST /api/research
 * 各種リサーチを実行
 *
 * GET /api/research/stream
 * リサーチ結果をストリーミング
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiHandler } from "@/lib/api/handler";
import { executeResearch, streamResearch } from "@/lib/research/service";

const researchSchema = z.object({
  type: z.enum(["cast", "info", "evidence"]),
  query: z.string().min(1, "検索クエリを入力してください"),
  options: z
    .object({
      includeX: z.boolean().optional(),
      includeWeb: z.boolean().optional(),
      maxResults: z.number().min(1).max(20).optional(),
    })
    .optional(),
});

export type ResearchRequest = z.infer<typeof researchSchema>;

/**
 * POST /api/research
 * 通常のリサーチ（非ストリーミング）
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const response = await executeResearch(data);
    return NextResponse.json({
      success: true,
      data: response,
    });
  },
  { schema: researchSchema },
);

/**
 * GET /api/research/stream
 * ストリーミングリサーチ
 *
 * Query Parameters:
 * - type: cast | info | evidence
 * - query: string
 * - includeX: boolean (optional)
 * - includeWeb: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") as "cast" | "info" | "evidence";
    const query = searchParams.get("query");
    const includeX = searchParams.get("includeX") === "true";
    const includeWeb = searchParams.get("includeWeb") === "true";

    if (!type || !query) {
      return NextResponse.json({ success: false, error: "typeとqueryは必須です" }, { status: 400 });
    }

    const stream = streamResearch({
      type,
      query,
      options: { includeX, includeWeb },
    });

    // ReadableStreamに変換
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Research stream error:", error);
    return NextResponse.json({ success: false, error: "リサーチに失敗しました" }, { status: 500 });
  }
}
