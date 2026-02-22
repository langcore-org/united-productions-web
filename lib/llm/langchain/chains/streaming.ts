/**
 * ストリーミングChain実装
 * 
 * SSE形式でストリーミングレスポンスを返す
 * LangChainのコールバック機能を活用して思考ステップとツール呼び出しを個別のイベントとして送信
 * 
 * @updated 2026-02-22 11:35
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMMessage, LLMUsage } from '../../types';
import { toLangChainMessages } from '../types';
import { StreamingCallbackHandler, type StreamingEvent } from '../callbacks/streaming';

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

    while (!streamDone) {
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

      // 小さな遅延を入れてイベント処理の機会を与える
      await new Promise(resolve => setTimeout(resolve, 10));
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
