/**
 * LLM関連ユーティリティ
 * 
 * プロバイダー検証、デフォルト値取得などの共通関数
 */

import { DEFAULT_PROVIDER, PROJECT_DEFAULT_PROVIDERS } from "./config";
import type { LLMProvider } from "./types";
import { isValidProvider } from "./factory";

/**
 * 有効なプロバイダーを取得
 * @param requestedProvider - リクエストされたプロバイダー（オプション）
 * @param projectId - プロジェクトID（オプション、指定時はプロジェクト固有のデフォルトを使用）
 * @returns 有効なLLMProvider
 * @throws Error 無効なプロバイダーが指定された場合
 */
export function resolveProvider(
  requestedProvider?: string,
  projectId?: keyof typeof PROJECT_DEFAULT_PROVIDERS
): LLMProvider {
  // リクエストされたプロバイダーを検証
  if (requestedProvider) {
    if (!isValidProvider(requestedProvider)) {
      throw new Error(`無効なプロバイダーです: ${requestedProvider}`);
    }
    return requestedProvider;
  }

  // プロジェクト固有のデフォルトを使用
  if (projectId && PROJECT_DEFAULT_PROVIDERS[projectId]) {
    return PROJECT_DEFAULT_PROVIDERS[projectId];
  }

  // グローバルデフォルトを使用
  return DEFAULT_PROVIDER;
}

/**
 * プロバイダーがGrok系かどうかを判定
 */
export function isGrokProvider(provider: LLMProvider): boolean {
  return provider.includes("grok");
}

/**
 * プロバイダーがGemini系かどうかを判定
 */
export function isGeminiProvider(provider: LLMProvider): boolean {
  return provider.includes("gemini");
}

/**
 * プロバイダーが検索機能を持つかどうかを判定
 */
export function hasSearchCapability(provider: LLMProvider): boolean {
  return provider.includes("grok") || provider.includes("perplexity");
}

/**
 * プロバイダーの表示名を取得
 */
export function getProviderDisplayName(provider: LLMProvider): string {
  const names: Record<string, string> = {
    "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
    "gemini-3.0-flash": "Gemini 3.0 Flash",
    "grok-4-1-fast-reasoning": "Grok 4.1 Fast",
    "grok-4-0709": "Grok 4",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-5": "GPT-5",
    "claude-sonnet-4.5": "Claude 4.5 Sonnet",
    "claude-opus-4.6": "Claude 4.6 Opus",
    "perplexity-sonar": "Perplexity Sonar",
    "perplexity-sonar-pro": "Perplexity Sonar Pro",
  };
  return names[provider] || provider;
}
