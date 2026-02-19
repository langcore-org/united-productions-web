/**
 * Word出力API
 *
 * POST /api/export/word
 * MarkdownコンテンツをWord(.docx)に変換して返却
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateWordDocument } from "@/lib/export/word-generator";
import { requireAuth } from "@/lib/api/auth";

// リクエストスキーマ
const wordExportSchema = z.object({
  content: z.string().min(1, "コンテンツを入力してください"),
  filename: z.string().optional(),
  title: z.string().optional(),
});

export type WordExportRequest = z.infer<typeof wordExportSchema>;

/**
 * POST /api/export/word
 *
 * Request Body:
 * {
 *   "content": "# 見出し\n\n本文テキスト",
 *   "filename": "議事録_20240219",
 *   "title": "議事録"
 * }
 *
 * Response:
 * - Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - Content-Disposition: attachment; filename="議事録_20240219.docx"
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // リクエストボディをパース
    const body = await request.json();

    // バリデーション
    const validationResult = wordExportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "入力データが不正です",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { content, filename, title } = validationResult.data;

    // Wordドキュメント生成
    const blob = await generateWordDocument(content, {
      title,
      author: "AD Production AI Hub",
    });

    // ArrayBufferに変換
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイル名設定
    const outputFilename = filename
      ? `${filename}.docx`
      : `document_${new Date().toISOString().split("T")[0]}.docx`;

    // レスポンス返却
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(outputFilename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Word export error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Word出力中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

// エラーハンドリング
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
