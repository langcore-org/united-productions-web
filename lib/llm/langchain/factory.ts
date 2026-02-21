/**
 * LangChainモデルファクトリー
 * 
 * プロバイダー別のLangChainモデルインスタンスを生成
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMProvider } from '../types';
import type { LangChainOptions } from './types';
import { getProviderConfig } from './config';

/**
 * LangChainモデルを生成
 */
export function createLangChainModel(
  provider: LLMProvider,
  options: LangChainOptions = {}
): BaseChatModel {
  const config = getProviderConfig(provider);
  const { temperature = 0.7, maxTokens, streaming = false } = options;

  const modelOptions = {
    modelName: config.model,
    temperature,
    maxTokens,
    streaming,
    apiKey: config.apiKey,
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  };

  switch (config.provider) {
    case 'openai':
    case 'xai':
    case 'perplexity':
      // xAIとPerplexityはOpenAI互換API
      return new ChatOpenAI({
        ...modelOptions,
        configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
      });

    case 'anthropic':
      return new ChatAnthropic({
        model: config.model,
        temperature,
        maxTokens,
        streaming,
        apiKey: config.apiKey,
      });

    case 'google':
      // Googleは別途@langchain/google-genaiが必要
      // 現状はエラーを投げるか、OpenAI互換で対応
      throw new Error(
        `Google provider requires @langchain/google-genai package. ` +
        `Please install it or use a different provider.`
      );

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * ストリーミング対応モデルを生成
 */
export function createStreamingModel(
  provider: LLMProvider,
  options: Omit<LangChainOptions, 'streaming'> = {}
): BaseChatModel {
  return createLangChainModel(provider, { ...options, streaming: true });
}
