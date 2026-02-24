/**
 * SSEストリームパーサー
 *
 * Server-Sent Events のパース処理を一元化するユーティリティ。
 * 新SSEイベント形式（discriminated union）に対応。
 */

export type { SSEEvent } from "./types";

/**
 * ReadableStream を SSEEvent の非同期ジェネレータとして読み取る
 *
 * @param reader - Response.body.getReader() から得たリーダー
 * @yields パースに成功した SSEEvent オブジェクト
 *
 * @example
 * ```ts
 * const reader = response.body?.getReader();
 * if (!reader) throw new Error('レスポンスボディを読み取れません');
 *
 * for await (const event of parseSSEStream(reader)) {
 *   if (event.type === 'content') setContent(prev => prev + event.delta);
 *   if (event.type === 'done') setIsComplete(true);
 * }
 * ```
 */
import type { SSEEvent } from "./types";

export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") return;

        try {
          yield JSON.parse(dataStr) as SSEEvent;
        } catch {
          // JSONパースエラーは無視して続行
        }
      }
    }

    // ストリーム終端に残ったバッファを処理
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ")) {
      const dataStr = trimmed.slice(6);
      if (dataStr !== "[DONE]") {
        try {
          yield JSON.parse(dataStr) as SSEEvent;
        } catch {
          // 無視
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
