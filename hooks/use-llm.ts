/**
 * useLLM Hook
 * 
 * LLM APIとの連携を行うカスタムフック
 * ストリーミングレスポンス対応、usage情報表示
 */

import { useState, useCallback, useRef } from 'react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';

interface UseLLMOptions {
  provider?: LLMProvider;
  onError?: (error: string) => void;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface UseLLMReturn {
  /**
   * チャットを送信（非ストリーミング）
   */
  chat: (messages: LLMMessage[]) => Promise<string>;
  
  /**
   * ストリーミングチャット
   */
  streamChat: (messages: LLMMessage[], onChunk: (chunk: string) => void) => Promise<{ content: string; usage?: UsageInfo }>;
  
  /**
   * ローディング状態
   */
  isLoading: boolean;
  
  /**
   * エラーメッセージ
   */
  error: string | null;
  
  /**
   * 最後のusage情報
   */
  lastUsage: UsageInfo | null;
}

/**
 * LLM連携フック
 */
export function useLLM(options: UseLLMOptions = {}): UseLLMReturn {
  const { provider, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  
  // AbortControllerを保持するref
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * エラーハンドリング
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  /**
   * チャットを送信（非ストリーミング）
   */
  const chat = useCallback(async (messages: LLMMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    // 既存のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          provider,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // usage情報を記録
      if (data.usage) {
        setLastUsage(data.usage);
      }
      
      return data.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      handleError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, handleError]);

  /**
   * ストリーミングチャット
   */
  const streamChat = useCallback(async (
    messages: LLMMessage[],
    onChunk: (chunk: string) => void
  ): Promise<{ content: string; usage?: UsageInfo }> => {
    setIsLoading(true);
    setError(null);
    setLastUsage(null);
    
    // 既存のリクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/llm/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          provider,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('レスポンスボディを読み取れません');
      }

      const decoder = new TextDecoder();
      let content = '';
      let finalUsage: UsageInfo | undefined;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const dataStr = line.slice(6); // Remove 'data: ' prefix
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              
              // コンテンツチャンク
              if (data.content) {
                content += data.content;
                onChunk(data.content);
              }
              
              // 完了時のusage情報
              if (data.done && data.usage) {
                finalUsage = data.usage;
                setLastUsage(data.usage);
              }
              
              // エラー
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // JSONパースエラーは無視
              if (!(parseError instanceof SyntaxError)) {
                throw parseError;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return { content, usage: finalUsage };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      handleError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider, handleError]);

  return {
    chat,
    streamChat,
    isLoading,
    error,
    lastUsage,
  };
}
