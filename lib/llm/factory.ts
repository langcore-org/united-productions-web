/**
 * LLM Factory
 * 
 * LangChainベースのLLMクライアント生成
 */

import { LLMProvider, LLMClient, VALID_PROVIDERS } from './types';
import { PROVIDER_CONFIG } from './config';
import { createLangChainClient } from './langchain/adapter';
import type { LangChainOptions } from './langchain/types';

export function getProviderInfo(provider: LLMProvider) {
  return PROVIDER_CONFIG[provider];
}

/**
 * LLMクライアントを生成するFactory関数（LangChain版）
 * 
 * @param provider - 使用するLLMプロバイダー
 * @param options - LangChainオプション
 * @returns LLMClientインターフェースを実装したクライアントインスタンス
 * 
 * @example
 * ```typescript
 * const client = createLLMClient('grok-4-1-fast-reasoning');
 * const response = await client.chat([{ role: 'user', content: 'Hello' }]);
 * ```
 */
export function createLLMClient(
  provider: LLMProvider,
  options?: LangChainOptions
): LLMClient {
  return createLangChainClient(provider, options);
}

/**
 * プロバイダーが有効かどうかを確認
 * 
 * @param provider - チェックするプロバイダー
 * @returns 有効な場合はtrue
 */
export function isValidProvider(provider: string): provider is LLMProvider {
  return VALID_PROVIDERS.includes(provider as LLMProvider);
}

/**
 * プロバイダーの表示名を取得
 * 
 * @param provider - LLMプロバイダー
 * @returns 表示名
 */
export function getProviderDisplayName(provider: LLMProvider): string {
  return getProviderInfo(provider).name;
}

/**
 * 同じベンダーのプロバイダーを取得
 * 
 * @param provider - 基準となるプロバイダー
 * @returns 同じベンダーのプロバイダー配列
 */
export function getSameVendorProviders(provider: LLMProvider): LLMProvider[] {
  const info = getProviderInfo(provider);
  const vendor = info.provider;
  
  const vendorMap: Record<string, LLMProvider[]> = {
    'Google': VALID_PROVIDERS.filter(p => p.startsWith('gemini-')),
    'xAI': VALID_PROVIDERS.filter(p => p.startsWith('grok-')),
    'OpenAI': VALID_PROVIDERS.filter(p => p.startsWith('gpt-')),
    'Anthropic': VALID_PROVIDERS.filter(p => p.startsWith('claude-')),
    'Perplexity': VALID_PROVIDERS.filter(p => p.startsWith('perplexity-')),
  };
  
  return vendorMap[vendor] || [provider];
}
