/**
 * LangChain統合の型定義
 * 
 * 既存のLLM型定義とLangChainの型定義の橋渡し
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { LLMMessage, LLMProvider, LLMResponse, LLMUsage } from '../types';

export { LLMMessage, LLMProvider, LLMResponse, LLMUsage };

/**
 * LangChain設定オプション
 */
export interface LangChainOptions {
  /** 温度（0-2） */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** トップP */
  topP?: number;
  /** システムプロンプト */
  systemPrompt?: string;
  /** ストリーミングコールバック */
  streaming?: boolean;
}

/**
 * Chain実行結果
 */
export interface ChainResult {
  content: string;
  usage?: LLMUsage;
  metadata?: Record<string, unknown>;
}

/**
 * プロバイダー設定
 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  provider?: string; // 内部使用（factory.tsで使用）
}

/**
 * メッセージ変換関数
 */
export function toLangChainMessages(messages: LLMMessage[]): BaseMessage[] {
  const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
  
  return messages.map(msg => {
    switch (msg.role) {
      case 'user':
        return new HumanMessage(msg.content);
      case 'assistant':
        return new AIMessage(msg.content);
      case 'system':
        return new SystemMessage(msg.content);
      default:
        return new HumanMessage(msg.content);
    }
  });
}

/**
 * LangChainメッセージから既存形式へ変換
 */
export function fromLangChainMessages(messages: BaseMessage[]): LLMMessage[] {
  return messages.map(msg => {
    const role = msg._getType() as 'human' | 'ai' | 'system';
    return {
      role: role === 'human' ? 'user' : role === 'ai' ? 'assistant' : 'system',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    };
  });
}
