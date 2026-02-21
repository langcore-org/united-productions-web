/**
 * LangChain設定
 * 
 * プロバイダー別の設定とモデルマッピング
 */

import type { LLMProvider } from '../types';
import type { ProviderConfig } from './types';

/**
 * プロバイダー別のモデルマッピング
 */
export const PROVIDER_MODEL_MAP: Record<LLMProvider, { model: string; provider: string }> = {
  'gemini-2.5-flash-lite': { model: 'gemini-2.5-flash-lite', provider: 'google' },
  'gemini-3.0-flash': { model: 'gemini-3.0-flash', provider: 'google' },
  'grok-4-1-fast-reasoning': { model: 'grok-4-1-fast-reasoning', provider: 'xai' },
  'grok-4-0709': { model: 'grok-4-0709', provider: 'xai' },
  'gpt-4o-mini': { model: 'gpt-4o-mini', provider: 'openai' },
  'gpt-5': { model: 'gpt-5', provider: 'openai' },
  // Claudeモデルは現在未使用（将来追加時に有効化）
  // 'claude-sonnet-4.5': { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
  // 'claude-opus-4.6': { model: 'claude-3-opus-20240229', provider: 'anthropic' },
  'perplexity-sonar': { model: 'sonar', provider: 'perplexity' },
  'perplexity-sonar-pro': { model: 'sonar-pro', provider: 'perplexity' },
};

/**
 * プロバイダー別の環境変数名
 */
const PROVIDER_ENV_KEYS: Record<string, string> = {
  google: 'GOOGLE_API_KEY',
  xai: 'XAI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};

/**
 * プロバイダー別のBaseURL
 */
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  google: undefined, // デフォルト使用
  xai: 'https://api.x.ai/v1',
  openai: undefined, // デフォルト使用
  anthropic: undefined, // デフォルト使用
  perplexity: 'https://api.perplexity.ai',
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
