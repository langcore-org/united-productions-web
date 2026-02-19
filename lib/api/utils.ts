/**
 * API共通ユーティリティ
 * 
 * API Routesでの共通処理をまとめます。
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LLMError } from "@/lib/llm/errors";

export { LLMError } from "@/lib/llm/errors";

/**
 * APIエラーをハンドリングして適切なレスポンスを返す
 * @param error - 発生したエラー
 * @returns NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  // Zodバリデーションエラー
  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: "バリデーションエラー", 
        details: error.errors.map(e => ({
          path: e.path.join("."),
          message: e.message,
        }))
      },
      { status: 400 }
    );
  }

  // LLMエラー
  if (error instanceof LLMError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // 一般的なエラー
  const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
  console.error("APIエラー:", error);
  
  return NextResponse.json(
    { error: "内部サーバーエラー", message },
    { status: 500 }
  );
}

/**
 * 成功レスポンスを作成
 * @param data - レスポンスデータ
 * @param status - HTTPステータスコード
 * @returns NextResponse
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * プロバイダー文字列を検証
 * @param provider - 検証するプロバイダー文字列
 * @param validProviders - 有効なプロバイダーの配列
 * @returns 検証済みプロバイダーまたはnull
 */
export function validateProvider(
  provider: string,
  validProviders: string[]
): string | null {
  if (!provider || typeof provider !== "string") {
    return null;
  }
  
  const normalized = provider.toLowerCase().trim();
  
  if (validProviders.includes(normalized)) {
    return normalized;
  }
  
  return null;
}

/**
 * リクエストボディを安全にパース
 * @param req - NextRequestオブジェクト
 * @returns パースされたボディまたはnull
 */
export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    const body = await req.json();
    return body as T;
  } catch {
    return null;
  }
}
