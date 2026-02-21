/**
 * LLM統合エクスポート
 * 
 * 既存実装とLangChain実装の統合エクスポート
 * 環境変数で実装を切り替え可能
 */

import type { LLMClient, LLMProvider } from './types';
import { createLLMClient as createLegacyClient } from './factory';
import { createLangChainClient } from './langchain/adapter';
import type { LangChainOptions } from './langchain/types';

/**
 * LangChain使用フラグ
 */
const USE_LANGCHAIN = process.env.USE_LANGCHAIN === 'true';

/**
 * LLMクライアントを生成
 * 
 * 環境変数 USE_LANGCHAIN=true でLangChain版を使用
 * それ以外の場合は既存実装を使用
 */
export function createLLMClient(
  provider: LLMProvider,
  options?: LangChainOptions
): LLMClient {
  if (USE_LANGCHAIN) {
    console.log(`[LLM] Using LangChain client for ${provider}`);
    return createLangChainClient(provider, options);
  }
  
  console.log(`[LLM] Using legacy client for ${provider}`);
  return createLegacyClient(provider);
}

/**
 * 明示的にLangChainクライアントを生成
 */
export function createLLMClientWithLangChain(
  provider: LLMProvider,
  options?: LangChainOptions
): LLMClient {
  return createLangChainClient(provider, options);
}

// 型定義の再エクスポート
export type { LLMClient, LLMProvider, LLMMessage, LLMResponse } from './types';
export type { LangChainOptions } from './langchain/types';

// 既存機能の再エクスポート
export { isValidProvider, getProviderDisplayName } from './factory';
export { VALID_PROVIDERS } from './types';
