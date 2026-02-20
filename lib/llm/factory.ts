/**
 * LLM Factory
 * 
 * 複数のLLMプロバイダーを統一インターフェースで生成するFactoryパターン
 * Wave 2で各クライアントが実装された後、実際のインスタンス生成が有効になる
 */

import { LLMProvider, LLMClient, LLMResponse } from './types';
import { getProviderInfo } from './config';
import { GeminiClient } from './clients/gemini';
import { PerplexityClient } from './clients/perplexity';
import { GrokClient, type GrokToolOptions } from './clients/grok';

/**
 * 未実装エラークラス
 * Wave 2で各クライアントが実装されるまで使用
 */
class NotImplementedClient implements LLMClient {
  constructor(private provider: LLMProvider) {}

  async chat(): Promise<LLMResponse> {
    throw new Error(
      `Provider "${this.provider}" is not implemented yet. ` +
      `It will be available in Wave 2.`
    );
  }

  async *stream(): AsyncIterable<string> {
    throw new Error(
      `Provider "${this.provider}" streaming is not implemented yet. ` +
      `It will be available in Wave 2.`
    );
  }
}

/**
 * LLMクライアントを生成するFactory関数
 * 
 * @param provider - 使用するLLMプロバイダー
 * @returns LLMClientインターフェースを実装したクライアントインスタンス
 * 
 * @example
 * ```typescript
 * const client = createLLMClient('gemini-2.5-flash-lite');
 * const response = await client.chat([{ role: 'user', content: 'Hello' }]);
 * ```
 */
export function createLLMClient(provider: LLMProvider): LLMClient {
  // Wave 2で各クライアントが実装されたら、ここで実際のクライアントを返す
  // 現在は未実装のプレースホルダーを返す
  
  switch (provider) {
    case 'gemini-2.5-flash-lite':
    case 'gemini-3.0-flash':
      return new GeminiClient(provider);
      
    case 'grok-4-1-fast-reasoning':
    case 'grok-4-0709':
      return new GrokClient(provider);
      
    case 'gpt-4o-mini':
    case 'gpt-5':
      // TODO: Wave 2で import { OpenAIClient } from './clients/openai' して返す
      return new NotImplementedClient(provider);
      
    case 'claude-sonnet-4.5':
    case 'claude-opus-4.6':
      // TODO: Wave 2で import { AnthropicClient } from './clients/anthropic' して返す
      return new NotImplementedClient(provider);
      
    case 'perplexity-sonar':
    case 'perplexity-sonar-pro':
      return new PerplexityClient(provider);
      
    default:
      // 型安全性のため、never型で網羅性チェック
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * プロバイダーが有効かどうかを確認
 * 
 * @param provider - チェックするプロバイダー
 * @returns 有効な場合はtrue
 */
export function isValidProvider(provider: string): provider is LLMProvider {
  const validProviders: LLMProvider[] = [
    'gemini-2.5-flash-lite',
    'gemini-3.0-flash',
    'grok-4-1-fast-reasoning',
    'grok-4-0709',
    'gpt-4o-mini',
    'gpt-5',
    'claude-sonnet-4.5',
    'claude-opus-4.6',
    'perplexity-sonar',
    'perplexity-sonar-pro',
  ];
  return validProviders.includes(provider as LLMProvider);
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
    'Google': ['gemini-2.5-flash-lite', 'gemini-3.0-flash'],
    'xAI': ['grok-4-1-fast-reasoning', 'grok-4-0709'],
    'OpenAI': ['gpt-4o-mini', 'gpt-5'],
    'Anthropic': ['claude-sonnet-4.5', 'claude-opus-4.6'],
    'Perplexity': ['perplexity-sonar', 'perplexity-sonar-pro'],
  };
  
  return vendorMap[vendor] || [provider];
}

/**
 * Grokクライアントをツールオプション付きで作成
 * 
 * @param provider - Grokプロバイダー
 * @param toolOptions - ツールオプション
 * @returns GrokClientインスタンス
 */
export function createGrokClientWithTools(
  provider: LLMProvider, 
  toolOptions: GrokToolOptions
): GrokClient {
  if (!provider.startsWith('grok-')) {
    throw new Error(`Provider "${provider}" is not a Grok provider`);
  }
  return new GrokClient(provider, toolOptions);
}
