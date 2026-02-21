/**
 * LangChain Chat Hook
 * 
 * LangChainバックエンドと連携するためのカスタムフック
 * ストリーミング対応
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UseLangChainChatOptions {
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  apiEndpoint?: string;
}

export interface UseLangChainChatReturn {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
  setInput: (input: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
}

/**
 * LangChainチャットフック
 */
export function useLangChainChat(options: UseLangChainChatOptions = {}): UseLangChainChatReturn {
  const {
    provider,
    temperature = 0.7,
    maxTokens,
    apiEndpoint = '/api/llm/langchain/stream',
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * ストリーミングレスポンスを処理
   */
  const handleStreamingResponse = useCallback(async (
    response: Response,
    assistantMessageId: string
  ) => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              setError(parsed.error);
              break;
            }

            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: fullContent }
                    : msg
                )
              );
            }

            if (parsed.done) {
              // ストリーミング完了
            }
          } catch {
            // JSONパースエラーは無視
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }, []);

  /**
   * メッセージ送信
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // リクエスト用メッセージ配列
    const requestMessages: LLMMessage[] = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage.content },
    ];

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          provider,
          temperature,
          maxTokens,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      await handleStreamingResponse(response, assistantMessage.id);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // エラー時にアシスタントメッセージを更新
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: `Error: ${errorMessage}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, messages, provider, temperature, maxTokens, apiEndpoint, handleStreamingResponse]);

  /**
   * ストリーミング停止
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  /**
   * 最後のメッセージを再送信
   */
  const reload = useCallback(async () => {
    if (messages.length < 2) return;

    // 最後のアシスタントメッセージを削除
    const lastUserMessage = messages.slice(-2)[0];
    if (lastUserMessage?.role !== 'user') return;

    setMessages(prev => prev.slice(0, -1));
    setInput(lastUserMessage.content);
    
    // 次のレンダーで送信
    setTimeout(() => {
      handleSubmit();
    }, 0);
  }, [messages, handleSubmit]);

  return {
    messages,
    input,
    isLoading,
    error,
    setInput,
    handleSubmit,
    stop,
    reload,
  };
}
