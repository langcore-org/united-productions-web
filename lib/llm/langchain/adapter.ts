/**
 * LangChain Adapter
 * 
 * 既存のLLMClientインターフェースとLangChainを橋渡しするアダプター
 * 段階的移行のための互換性レイヤー
 */

import type { LLMClient, LLMMessage, LLMResponse } from '../types';
import type { LLMProvider } from '../types';
import { createLangChainModel } from './factory';
import { executeChat, executeStreamingChat } from './chains/base';
import type { LangChainOptions } from './types';

/**
 * LangChain版 LLMClientアダプター
 */
export class LangChainClientAdapter implements LLMClient {
  private provider: LLMProvider;
  private options: LangChainOptions;

  constructor(provider: LLMProvider, options: LangChainOptions = {}) {
    this.provider = provider;
    this.options = options;
  }

  /**
   * チャット完了を取得
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const model = createLangChainModel(this.provider, this.options);
    return executeChat(model, messages, this.provider);
  }

  /**
   * ストリーミングレスポンスを取得
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const model = createLangChainModel(this.provider, {
      ...this.options,
      streaming: true,
    });

    for await (const { chunk, error } of executeStreamingChat(model, messages)) {
      if (error) {
        throw new Error(error);
      }
      if (chunk) {
        yield chunk;
      }
    }
  }
}

/**
 * 既存ファクトリー関数と互換性のあるLangChainクライアント生成
 */
export function createLangChainClient(
  provider: LLMProvider,
  options?: LangChainOptions
): LLMClient {
  return new LangChainClientAdapter(provider, options);
}
