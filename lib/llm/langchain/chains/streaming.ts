/**
 * ストリーミングChain実装
 * 
 * SSE形式でストリーミングレスポンスを返す
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMMessage, LLMUsage } from '../../types';
import { toLangChainMessages } from '../types';

/**
 * ストリーミングレスポンスの型
 */
export interface StreamingYield {
  chunk?: string;
  usage?: LLMUsage;
  error?: string;
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
  try {
    // メッセージを変換
    const langChainMessages = toLangChainMessages(messages);
    
    // ストリーミング実行
    const stream = await model.stream(langChainMessages);

    let totalLength = 0;
    let chunkCount = 0;

    for await (const chunk of stream) {
      // chunkの型はモデルによって異なる
      const content = typeof chunk.content === 'string' 
        ? chunk.content 
        : JSON.stringify(chunk.content);
      
      if (content) {
        totalLength += content.length;
        chunkCount++;
        yield { chunk: content };
      }
    }

    // ストリーミング終了後のusage（推定値）
    // 注意: LangChainではストリーミング時のusage取得が制限される
    const estimatedOutputTokens = Math.ceil(totalLength / 4);
    
    yield {
      usage: {
        inputTokens: 0, // 正確な値はモデルから取得困難
        outputTokens: estimatedOutputTokens,
        cost: 0, // 後で計算
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
        for await (const { chunk, usage, error } of iterator) {
          if (error) {
            const data = JSON.stringify({ error });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            break;
          }

          if (chunk) {
            const data = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          if (usage) {
            const data = JSON.stringify({ done: true, usage });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
