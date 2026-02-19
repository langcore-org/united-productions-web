/**
 * ファイルアップロードAPI
 *
 * POST /api/upload
 * 各種ファイルからテキストを抽出
 */

import { NextRequest, NextResponse } from "next/server";
import { parseFile, MAX_FILE_SIZE } from "@/lib/upload/file-parser";
import { requireAuth } from "@/lib/api/auth";

/**
 * POST /api/upload
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: file (File)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "text": "抽出されたテキスト",
 *     "filename": "document.txt",
 *     "size": 1024
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // FormDataをパース
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `ファイルサイズは${formatBytes(MAX_FILE_SIZE)}以下にしてください`,
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    // ファイル解析
    const parsed = await parseFile(file);

    return NextResponse.json({
      success: true,
      data: {
        text: parsed.text,
        filename: parsed.filename,
        size: parsed.size,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);

    if (error && typeof error === "object" && "code" in error) {
      const parseError = error as { code: string; message: string };
      return NextResponse.json(
        { success: false, error: parseError.message, code: parseError.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "ファイルの処理に失敗しました" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 最大ボディサイズ設定
export const maxBodyLength = 11 * 1024 * 1024; // 11MB (少し余裕を持たせる)
