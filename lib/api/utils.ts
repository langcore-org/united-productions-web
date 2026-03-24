/**
 * API共通ユーティリティ
 *
 * API Routesでの共通処理をまとめます。
 *
 * @updated 2026-03-24: errorResponse ヘルパー追加（B-4 エラーフォーマット統一）
 */

import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { LLMError } from "@/lib/llm/errors";

export { LLMError } from "@/lib/llm/errors";

/**
 * 統一エラーレスポンスの型
 *
 * 全APIルートで使用する標準フォーマット:
 * - error: 人間が読めるエラーメッセージ（必須）
 * - details: バリデーションエラーの詳細（任意）
 * - code: マシンリーダブルなエラーコード（任意）
 */
interface ApiErrorBody {
  error: string;
  details?: Array<{ path: string; message: string }>;
  code?: string;
}

/**
 * 統一フォーマットのエラーレスポンスを作成
 *
 * `success: false` パターンや `requestId` の混在を排除し、
 * HTTPステータスコードでエラー判定する設計に統一。
 */
export function errorResponse(
  message: string,
  status: number,
  options?: { details?: ApiErrorBody["details"]; code?: string },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (options?.details) body.details = options.details;
  if (options?.code) body.code = options.code;
  return NextResponse.json(body, { status });
}

/**
 * Zodバリデーションエラーから統一エラーレスポンスを作成
 */
export function validationErrorResponse(zodError: ZodError): NextResponse<ApiErrorBody> {
  return errorResponse("バリデーションエラー", 400, {
    details: zodError.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  });
}

/**
 * APIエラーをハンドリングして適切なレスポンスを返す
 * @param error - 発生したエラー
 * @returns NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  if (error instanceof LLMError) {
    return errorResponse(error.message, error.statusCode, { code: error.code });
  }

  const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
  console.error("APIエラー:", error);

  return errorResponse("内部サーバーエラー", 500);
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
export function validateProvider(provider: string, validProviders: string[]): string | null {
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
