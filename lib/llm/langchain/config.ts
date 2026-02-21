/**
 * LangChain設定
 * 
 * プロバイダー別の設定とモデルマッピング
 * 
 * 現在使用中: Grokのみ
 */

import type { LLMProvider } from '../types';
import type { ProviderConfig } from './types';

/**
 * プロバイダー別のモデルマッピング
 * 
 * 注意: 現在使用しているのはgrokのみ
 */
export const PROVIDER_MODEL_MAP: Record<LLMProvider, { model: string; provider: string }> = {
  // Google Gemini - 将来追加予定
  // 'gemini-2.5-flash-lite': { model: 'gemini-2.5-flash-lite', provider: 'google' },
  // 'gemini-3.0-flash': { model: 'gemini-3.0-flash', provider: 'google' },

  // xAI Grok - 現在使用中
  'grok-4-1-fast-reasoning': { model: 'grok-4-1-fast-reasoning', provider: 'xai' },
  'grok-4-0709': { model: 'grok-4-0709', provider: 'xai' },

  // OpenAI - 将来追加予定
  // 'gpt-4o-mini': { model: 'gpt-4o-mini', provider: 'openai' },
  // 'gpt-5': { model: 'gpt-5', provider: 'openai' },

  // Anthropic Claude - 将来追加予定
  // 'claude-sonnet-4.5': { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  // 'claude-opus-4.6': { model: 'claude-3-opus-20240229', provider: 'anthropic' },

  // Perplexity - 将来追加予定
  // 'perplexity-sonar': { model: 'sonar', provider: 'perplexity' },
  // 'perplexity-sonar-pro': { model: 'sonar-pro', provider: 'perplexity' },
};

/**
 * プロバイダー別の環境変数名
 */
const PROVIDER_ENV_KEYS: Record<string, string> = {
  // google: 'GOOGLE_API_KEY',  // 将来追加予定
  xai: 'XAI_API_KEY',
  // openai: 'OPENAI_API_KEY',  // 将来追加予定
  // anthropic: 'ANTHROPIC_API_KEY',  // 将来追加予定
  // perplexity: 'PERPLEXITY_API_KEY',  // 将来追加予定
};

/**
 * プロバイダー別のBaseURL
 */
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  // google: undefined,  // 将来追加予定
  xai: 'https://api.x.ai/v1',
  // openai: undefined,  // 将来追加予定
  // anthropic: undefined,  // 将来追加予定
  // perplexity: 'https://api.perplexity.ai',  // 将来追加予定
};

/**
 * プロバイダー設定を取得
 */
export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  const mapping = PROVIDER_MODEL_MAP[provider];
  if (!mapping) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const envKey = PROVIDER_ENV_KEYS[mapping.provider];
  const apiKey = process.env[envKey];

  if (!apiKey) {
    throw new Error(`Environment variable ${envKey} is not set for provider ${provider}`);
  }

  return {
    apiKey,
    baseUrl: PROVIDER_BASE_URLS[mapping.provider],
    model: mapping.model,
    provider: mapping.provider,
  };
}

/**
 * 利用可能なプロバイダーかチェック
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  try {
    const config = getProviderConfig(provider);
    return !!config.apiKey;
  } catch {
    return false;
  }
}
