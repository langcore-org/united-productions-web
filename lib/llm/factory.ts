/**
 * LLM Factory
 *
 * LLMプロバイダーを統一インターフェースで生成するFactoryパターン
 * grok-* → GrokClient（直接実装・xAI Responses API）
 * その他 → 将来のLangChain等に対応予定
 *
 * 復元元: git commit 70c1823~1（LangChain移行前）
 */

import { GrokClient } from "./clients/grok";
import { PROVIDER_CONFIG } from "./config";
import { type LLMClient, type LLMProvider, VALID_PROVIDERS } from "./types";

export function getProviderInfo(provider: LLMProvider) {
  return PROVIDER_CONFIG[provider];
}

/**
 * LLMクライアントを生成するFactory関数
 *
 * @param provider - 使用するLLMプロバイダー
 * @returns LLMClientインターフェースを実装したクライアントインスタンス
 */
export function createLLMClient(provider: LLMProvider): LLMClient {
  switch (provider) {
    case "grok-4-1-fast-reasoning":
    case "grok-4.20-multi-agent-beta-latest":
      return new GrokClient(provider);

    default: {
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unknown or unsupported provider: ${_exhaustiveCheck}`);
    }
  }
}

/**
 * プロバイダーが有効かどうかを確認
 */
export function isValidProvider(provider: string): provider is LLMProvider {
  return VALID_PROVIDERS.includes(provider as LLMProvider);
}

/**
 * プロバイダーの表示名を取得
 */
export function getProviderDisplayName(provider: LLMProvider): string {
  return getProviderInfo(provider).name;
}

/**
 * 同じベンダーのプロバイダーを取得
 */
export function getSameVendorProviders(provider: LLMProvider): LLMProvider[] {
  const info = getProviderInfo(provider);
  const vendor = info.provider;

  const vendorMap: Record<string, LLMProvider[]> = {
    xAI: VALID_PROVIDERS.filter((p) => p.startsWith("grok-")),
  };

  return vendorMap[vendor] || [provider];
}
