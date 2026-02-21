/**
 * 基本Chain実装
 * 
 * シンプルなチャット完了用のChain
 */

import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMMessage, LLMResponse, LLMUsage } from '../../types';
import type { ChainResult } from '../types';
import { toLangChainMessages } from '../types';
import { getProviderInfo } from '../../config';
import type { LLMProvider } from '../../types';

/**
 * 基本チャットChainを作成
 */
export function createChatChain(model: BaseChatModel) {
  return RunnableSequence.from([
    // 入力をメッセージに変換
    (input: { messages: LLMMessage[] }) => toLangChainMessages(input.messages),
    // モデルで処理
    model,
    // 文字列として出力
    new StringOutputParser(),
  ]);
}

/**
 * チャットを実行
 */
export async function executeChat(
  model: BaseChatModel,
  messages: LLMMessage[],
  provider: LLMProvider
): Promise<LLMResponse> {
  const chain = createChatChain(model);
  const content = await chain.invoke({ messages });

  // usage情報の取得（モデルによって異なる）
  // 注意: LangChainではusage情報の取得がモデル依存
  const usage: LLMUsage = {
    inputTokens: 0, // 後で計算または推定
    outputTokens: 0,
    cost: 0,
  };

  return {
    content,
    usage,
  };
}

/**
 * ストリーミングチャットを実行
 */
export async function* executeStreamingChat(
  model: BaseChatModel,
  messages: LLMMessage[]
): AsyncIterable<{ chunk?: string; usage?: LLMUsage }> {
  const chain = createChatChain(model);
  const stream = await chain.stream({ messages });

  let totalLength = 0;

  for await (const chunk of stream) {
    totalLength += chunk.length;
    yield { chunk };
  }

  // ストリーミング終了後のusage（推定値）
  yield {
    usage: {
      inputTokens: 0,
      outputTokens: Math.ceil(totalLength / 4), // おおよその推定
      cost: 0,
    },
  };
}
