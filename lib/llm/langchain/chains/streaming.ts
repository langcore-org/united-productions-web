/**
 * ストリーミングChain実装
 * 
 * SSE形式でストリーミングレスポンスを返す
 * LangChainのコールバック機能を活用して思考ステップとツール呼び出しを個別のイベントとして送信
 * 
 * @updated 2026-02-22 12:00
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMMessage, LLMUsage } from '../../types';
import { toLangChainMessages } from '../types';
import { StreamingCallbackHandler, type StreamingEvent } from '../callbacks/streaming';

/**
 * ストリーミング設定
 */
const STREAMING_CONFIG = {
  /** イベント送信間隔（ms） */
  EMIT_INTERVAL_MS: 10,
  /** イベントキューの最大サイズ */
  MAX_QUEUE_SIZE: 1000,
  /** ストリーム読み取りタイムアウト（ms） */
  STREAM_TIMEOUT_MS: 30000,
} as const;

/**
 * ストリーミングレスポンスの型
 */
export interface StreamingYield {
  chunk?: string;
  usage?: LLMUsage;
  error?: string;
  /** リクエスト受理イベント */
  accepted?: boolean;
  /** 思考ステップ開始 */
  stepStart?: {
    step: number;
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
  };
  /** 思考ステップ更新 */
  stepUpdate?: {
    id: string;
    content?: string;
    status?: 'pending' | 'running' | 'completed' | 'error';
  };
  /** ツール呼び出しイベント */
  toolCallEvent?: {
    id: string;
    type: string;
    name?: string;
    input?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
  /** 完了イベント */
  done?: boolean;
}

/**
 * ストリーミングチャットを実行
 * 
 * @param model - LangChainモデル
 * @param messages - メッセージ配列
 * @returns ストリーミングイテレータ
 */
export async function* executeStreamingChat(
  model: BaseChatModel,
  messages: LLMMessage[]
): AsyncIterable<StreamingYield> {
  // 即座に受理イベントを送信
  yield { accepted: true };

  // イベントキュー
  const eventQueue: StreamingEvent[] = [];
  
  // コールバックハンドラーを作成
  const callbackHandler = new StreamingCallbackHandler((event) => {
    eventQueue.push(event);
  });

  try {
    // メッセージを変換
    const langChainMessages = toLangChainMessages(messages);
    
    // ストリーミング実行（コールバック付き）
    const stream = await model.stream(langChainMessages, {
      callbacks: [callbackHandler],
    });

    let totalLength = 0;

    // ストリームとイベントキューを同時に処理
    const streamIterator = stream[Symbol.asyncIterator]();
    let streamDone = false;
    const streamStartTime = Date.now();

    while (!streamDone) {
      // タイムアウトチェック
      if (Date.now() - streamStartTime > STREAMING_CONFIG.STREAM_TIMEOUT_MS) {
        yield { error: 'Stream timeout' };
        break;
      }

      // イベントキューのサイズ制限チェック
      if (eventQueue.length > STREAMING_CONFIG.MAX_QUEUE_SIZE) {
        console.warn(`[Streaming] Event queue overflow: ${eventQueue.length} events, dropping oldest`);
        // 古いイベントを削除（半分を削除）
        eventQueue.splice(0, Math.floor(eventQueue.length / 2));
      }

      // イベントキューからイベントを取得
      while (eventQueue.length > 0) {
        const event = eventQueue.shift()!;
        
        // イベントをStreamingYieldに変換してyield
        if (event.stepStart) {
          yield { stepStart: event.stepStart };
        }
        if (event.stepUpdate) {
          yield { stepUpdate: event.stepUpdate };
        }
        if (event.toolCallEvent) {
          yield { toolCallEvent: event.toolCallEvent };
        }
        if (event.content) {
          yield { chunk: event.content };
          totalLength += event.content.length;
        }
        if (event.error) {
          yield { error: event.error };
        }
        if (event.done) {
          yield { done: true };
        }
      }

      // ストリームから次のチャンクを取得
      try {
        const result = await streamIterator.next();
        if (result.done) {
          streamDone = true;
        } else {
          const chunk = result.value;
          const content = typeof chunk.content === 'string' 
            ? chunk.content 
            : JSON.stringify(chunk.content);
          
          if (content) {
            totalLength += content.length;
            yield { chunk: content };
          }
        }
      } catch (streamError) {
        const errorMessage = streamError instanceof Error ? streamError.message : 'Stream read error';
        yield { error: errorMessage };
        break;
      }

      // イベントループに制御を戻す（他の非同期処理の機会を与える）
      await new Promise(resolve => setTimeout(resolve, STREAMING_CONFIG.EMIT_INTERVAL_MS));
    }

    // 残りのイベントを処理
    while (eventQueue.length > 0) {
      const event = eventQueue.shift()!;
      if (event.stepStart) yield { stepStart: event.stepStart };
      if (event.stepUpdate) yield { stepUpdate: event.stepUpdate };
      if (event.toolCallEvent) yield { toolCallEvent: event.toolCallEvent };
      if (event.done) yield { done: true };
    }

    // ストリーミング終了後のusage（推定値）
    const estimatedOutputTokens = Math.ceil(totalLength / 4);
    
    yield {
      usage: {
        inputTokens: 0,
        outputTokens: estimatedOutputTokens,
        cost: 0,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    yield { error: errorMessage };
  }
}

/**
 * SSE形式のレスポンスを作成
 */
export function createSSEStream(
  iterator: AsyncIterable<StreamingYield>
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of iterator) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // エラーまたは完了時は終了
          if (event.error || event.usage) {
            break;
          }
        }

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Stream error';
        const data = JSON.stringify({ error: errorMessage });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      }
    },
  });
}
