/**
 * SSEストリームパーサー
 *
 * Server-Sent Events のパース処理を一元化するユーティリティ。
 * バッファリングにより、行をまたいだSSEデータも正しく処理する。
 */

import type { LLMUsage, ToolCallInfo, ReasoningStep } from './types';

/**
 * ツール使用状況
 */
export interface SSEToolUsage {
  web_search_calls?: number;
  x_search_calls?: number;
  code_interpreter_calls?: number;
  file_search_calls?: number;
  mcp_calls?: number;
  document_search_calls?: number;
}

/**
 * 思考ステップイベント
 */
export interface SSEStepEvent {
  /** ステップ番号 */
  step: number;
  /** ステップID */
  id: string;
  /** ステップタイトル */
  title: string;
  /** ステップ内容 */
  content?: string;
  /** ステップ状態 */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** ステップタイプ */
  type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
}

/**
 * ツール呼び出しイベント
 */
export interface SSEToolCallEvent {
  /** ツールID */
  id: string;
  /** ツールタイプ */
  type: string;
  /** ツール名 */
  name?: string;
  /** 入力パラメータ */
  input?: string;
  /** ステータス */
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * SSEイベントの型
 * `/api/llm/stream` から送信される全イベントを網羅する
 */
export interface SSEEvent {
  content?: string;
  thinking?: string;
  toolCall?: ToolCallInfo;
  reasoning?: ReasoningStep;
  toolUsage?: SSEToolUsage;
  done?: boolean;
  usage?: LLMUsage;
  error?: string;
  /** リクエスト受理イベント（即座に送信） */
  accepted?: boolean;
  /** 思考ステップ開始イベント */
  stepStart?: SSEStepEvent;
  /** 思考ステップ更新イベント */
  stepUpdate?: {
    id: string;
    content?: string;
    status?: 'pending' | 'running' | 'completed' | 'error';
  };
  /** ツール呼び出しイベント */
  toolCallEvent?: SSEToolCallEvent;
}

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
 *   if (event.content) setContent(prev => prev + event.content);
 *   if (event.done) setIsComplete(true);
 * }
 * ```
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') return;

        try {
          yield JSON.parse(dataStr) as SSEEvent;
        } catch {
          // JSONパースエラーは無視して続行
        }
      }
    }

    // ストリーム終端に残ったバッファを処理
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data: ')) {
      const dataStr = trimmed.slice(6);
      if (dataStr !== '[DONE]') {
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
