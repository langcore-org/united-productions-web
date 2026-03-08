/**
 * LLMエラークラス
 *
 * LLM関連のエラーを統一して扱うためのカスタムエラークラス
 */

export type LLMErrorCode = "RATE_LIMIT" | "AUTH" | "TIMEOUT" | "UNKNOWN" | "VALIDATION";

/**
 * LLMエラークラス
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code: LLMErrorCode = "UNKNOWN",
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/**
 * HTTPレスポンスからLLMエラーを生成
 * @param response - fetch APIのResponseオブジェクト
 * @param provider - プロバイダー名
 * @returns never（例外をスロー）
 */
export async function handleLLMError(response: Response, provider: string): Promise<never> {
  const errorText = await response.text().catch(() => "Unknown error");

  switch (response.status) {
    case 429:
      throw new LLMError(
        `${provider} API レート制限に達しました。しばらく経ってからお試しください。`,
        "RATE_LIMIT",
        429,
      );
    case 401:
    case 403:
      throw new LLMError(
        `${provider} API 認証エラーです。APIキーを確認してください。`,
        "AUTH",
        401,
      );
    case 408:
    case 504:
      throw new LLMError(
        `${provider} API タイムアウトしました。もう一度お試しください。`,
        "TIMEOUT",
        504,
      );
    default:
      throw new LLMError(
        `${provider} API エラー: ${response.status} - ${errorText}`,
        "UNKNOWN",
        response.status,
      );
  }
}

/**
 * エラーをLLMErrorに変換
 * @param error - 不明なエラー
 * @param provider - プロバイダー名
 * @returns LLMError
 */
export function toLLMError(error: unknown, provider: string): LLMError {
  if (error instanceof LLMError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
  return new LLMError(`${provider} エラー: ${message}`, "UNKNOWN", 500);
}
