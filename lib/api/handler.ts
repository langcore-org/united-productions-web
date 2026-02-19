/**
 * API共通ハンドラー
 * 
 * API Routesでの認証・バリデーション・エラーハンドリングを共通化
 */

import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { requireAuth } from "./auth";
import { handleApiError } from "./utils";

interface HandlerOptions<T> {
  schema?: ZodSchema<T>;
  requireAuth?: boolean;
}

interface HandlerContext<T> {
  request: NextRequest;
  data: T;
  userId: string;
}

/**
 * APIハンドラーを作成
 * 
 * @param handler - リクエストハンドラー
 * @param options - オプション（スキーマ、認証要件）
 * @returns Next.js APIハンドラー
 * 
 * @example
 * const requestSchema = z.object({ name: z.string() });
 * 
 * export const POST = createApiHandler(
 *   async ({ request, data, userId }) => {
 *     // ビジネスロジック
 *     return NextResponse.json({ success: true });
 *   },
 *   { schema: requestSchema }
 * );
 */
export function createApiHandler<T>(
  handler: (ctx: HandlerContext<T>) => Promise<NextResponse>,
  options: HandlerOptions<T> = {}
) {
  const { schema, requireAuth: shouldRequireAuth = true } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 認証チェック
      let userId = "";
      if (shouldRequireAuth) {
        const authResult = await requireAuth(request);
        if (authResult instanceof NextResponse) {
          return authResult;
        }
        userId = authResult.user.id;
      }

      // リクエストボディのパースとバリデーション
      let data = {} as T;
      if (schema) {
        try {
          const body = await request.json();
          const validationResult = schema.safeParse(body);
          
          if (!validationResult.success) {
            return NextResponse.json(
              {
                error: "バリデーションエラー",
                details: validationResult.error.errors.map((e) => ({
                  path: e.path.join("."),
                  message: e.message,
                })),
              },
              { status: 400 }
            );
          }
          
          data = validationResult.data;
        } catch {
          return NextResponse.json(
            { error: "リクエストボディのパースに失敗しました" },
            { status: 400 }
          );
        }
      }

      // ハンドラーを実行
      return await handler({ request, data, userId });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "バリデーションエラー",
            details: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      
      return handleApiError(error);
    }
  };
}

/**
 * ストリーミングレスポンスを作成
 */
export function createStreamingResponse(
  generator: AsyncGenerator<string, void, unknown>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "ストリーミングエラー";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
