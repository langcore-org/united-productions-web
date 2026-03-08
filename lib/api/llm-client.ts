/**
 * LLM APIクライアント
 *
 * HTTPリクエスト・エラーハンドリング・SSEストリーム読み取りを集約し、
 * フック（useLLMStream, useLangChainChat）から直接 fetch を呼ばなくて済むようにする。
 */

import { parseSSEStream, type SSEEvent } from "@/lib/llm/sse-parser";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";

/**
 * LLMストリームリクエストの型
 */
export interface LLMStreamRequest {
  messages: LLMMessage[];
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  /** 機能ID（例: research-cast, proposal, general-chat） */
  featureId?: string;
  /** 番組ID（"all"または特定の番組ID） */
  programId?: string;
}

/**
 * LLM APIエラー
 *
 * HTTPエラーやレスポンスパースエラーを構造化して保持する。
 * ステータスコードやサーバー側のリクエストIDを含む。
 */
export class LLMApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly serverRequestId?: string,
  ) {
    super(message);
    this.name = "LLMApiError";
  }
}

/** デフォルトのAPIエンドポイント */
const DEFAULT_ENDPOINT = "/api/llm/stream";

/**
 * LLMストリーミングレスポンスを取得する非同期ジェネレータ
 *
 * fetch + SSEパースを一括で行い、SSEEvent を yield する。
 * エラー時は LLMApiError をスローする。
 *
 * @param request - リクエストパラメータ
 * @param options - エンドポイントやAbortSignal等のオプション
 * @yields パースされた SSEEvent
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * for await (const event of streamLLMResponse(
 *   { messages, provider },
 *   { signal: controller.signal }
 * )) {
 *   if (event.content) console.log(event.content);
 * }
 * ```
 */
export async function* streamLLMResponse(
  request: LLMStreamRequest,
  options?: {
    endpoint?: string;
    signal?: AbortSignal;
  },
): AsyncGenerator<SSEEvent> {
  const endpoint = options?.endpoint ?? DEFAULT_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: options?.signal,
  });

  if (!response.ok) {
    let errorData: { error?: string; message?: string; requestId?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // JSONパース失敗時は無視
    }

    throw new LLMApiError(
      errorData.error || errorData.message || `HTTP error: ${response.status}`,
      response.status,
      errorData.requestId,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new LLMApiError("Response body is not readable");
  }

  yield* parseSSEStream(reader);
}
