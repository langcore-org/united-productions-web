/**
 * LangChain Memory
 * 
 * 会話履歴管理の高度化（簡略版）
 * 
 * 注: 完全なMemory機能は別途 langchain パッケージが必要
 */

import type { LLMMessage } from '../../types';

/**
 * メモリ設定オプション
 */
export interface MemoryOptions {
  /** 保持する最大メッセージ数 */
  maxMessages?: number;
  /** 会話ID（永続化時に使用） */
  conversationId?: string;
}

/**
 * シンプルなインメモリ会話履歴
 */
export class SimpleChatMemory {
  private messages: LLMMessage[] = [];
  private maxMessages: number;

  constructor(options: MemoryOptions = {}) {
    this.maxMessages = options.maxMessages || 10;
  }

  /**
   * メッセージを追加
   */
  async addMessage(message: LLMMessage): Promise<void> {
    this.messages.push(message);
    
    // 最大数を超えたら古いものを削除
    if (this.messages.length > this.maxMessages * 2) {
      this.messages = this.messages.slice(-this.maxMessages * 2);
    }
  }

  /**
   * 会話履歴を取得
   */
  async getMessages(): Promise<LLMMessage[]> {
    return [...this.messages];
  }

  /**
   * 会話履歴をクリア
   */
  async clear(): Promise<void> {
    this.messages = [];
  }
}

/**
 * インメモリ会話履歴を作成
 */
export function createChatMemory(options: MemoryOptions = {}): SimpleChatMemory {
  return new SimpleChatMemory(options);
}

/**
 * 既存メッセージから会話履歴を作成
 */
export async function createMemoryFromMessages(
  messages: LLMMessage[],
  options: MemoryOptions = {}
): Promise<SimpleChatMemory> {
  const memory = createChatMemory(options);
  
  for (const message of messages) {
    await memory.addMessage(message);
  }

  return memory;
}

/**
 * メモリ付きChain実行ヘルパー
 */
export async function executeWithMemory(
  memory: SimpleChatMemory,
  input: string,
  executor: (input: string, history: LLMMessage[]) => Promise<string>
): Promise<{ output: string; memory: SimpleChatMemory }> {
  const history = await memory.getMessages();
  const output = await executor(input, history);
  
  // メモリを更新
  await memory.addMessage({ role: 'user', content: input });
  await memory.addMessage({ role: 'assistant', content: output });

  return { output, memory };
}

/**
 * 会話履歴をクリア
 */
export async function clearMemory(memory: SimpleChatMemory): Promise<void> {
  await memory.clear();
}

/**
 * 会話履歴を取得
 */
export async function getMemoryMessages(memory: SimpleChatMemory): Promise<LLMMessage[]> {
  return memory.getMessages();
}
