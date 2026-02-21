/**
 * LangChain Memory
 * 
 * 会話履歴管理の高度化
 */

import { BufferMemory } from 'langchain/memory';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { LLMMessage } from '../../types';
import { toLangChainMessages } from '../types';

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
 * インメモリ会話履歴を作成
 */
export function createChatMemory(options: MemoryOptions = {}): BufferMemory {
  const { maxMessages = 10 } = options;

  return new BufferMemory({
    chatHistory: new ChatMessageHistory(),
    returnMessages: true,
    memoryKey: 'chat_history',
    inputKey: 'input',
    outputKey: 'output',
    k: maxMessages,
  });
}

/**
 * 既存メッセージから会話履歴を作成
 */
export async function createMemoryFromMessages(
  messages: LLMMessage[],
  options: MemoryOptions = {}
): Promise<BufferMemory> {
  const memory = createChatMemory(options);
  const langChainMessages = toLangChainMessages(messages);

  // メッセージを履歴に追加
  for (let i = 0; i < langChainMessages.length - 1; i += 2) {
    const human = langChainMessages[i];
    const ai = langChainMessages[i + 1];
    
    if (human && ai) {
      await memory.chatHistory.addMessage(human);
      await memory.chatHistory.addMessage(ai);
    }
  }

  return memory;
}

/**
 * メモリ付きChain実行ヘルパー
 */
export async function executeWithMemory(
  memory: BufferMemory,
  input: string,
  executor: (input: string, memory: BufferMemory) => Promise<string>
): Promise<{ output: string; memory: BufferMemory }> {
  const output = await executor(input, memory);
  
  // メモリを更新
  await memory.saveContext(
    { input },
    { output }
  );

  return { output, memory };
}

/**
 * 会話履歴をクリア
 */
export async function clearMemory(memory: BufferMemory): Promise<void> {
  await memory.chatHistory.clear();
}

/**
 * 会話履歴を取得
 */
export async function getMemoryMessages(memory: BufferMemory): Promise<LLMMessage[]> {
  const messages = await memory.chatHistory.getMessages();
  
  return messages.map(msg => ({
    role: msg._getType() === 'human' ? 'user' : 
          msg._getType() === 'ai' ? 'assistant' : 'system',
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));
}
