/**
 * useLLM Hook
 * 
 * LLM APIとの連携を行うカスタムフック（統合版）
 * ストリーミングレスポンス対応、usage情報表示
 * useLLMStreamからの機能を統合
 */

import { useState, useCallback, useRef } from 'react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { parseSSEStream } from '@/lib/llm/sse-parser';

interface UseLLMOptions {
  provider?: LLMProvider;
  onError?: (error: string) => void;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface StreamState {
  content: string;
  thinking: string;
  isComplete: boolean;
  error: string | null;
  usage: UsageInfo | null;
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
   * ストリーム状態（統合版機能）
   */
  streamState: StreamState;
  
  /**
   * ストリームを開始（統合版機能 - useLLMStreamから移行）
   */
  startStream: (messages: LLMMessage[], provider?: LLMProvider, toolOptions?: { enableWebSearch?: boolean }) => Promise<void>;
  
  /**
   * ストリームをキャンセル
   */
  cancelStream: () => void;
  
  /**
   * ストリームをリセット
   */
  resetStream: () => void;
  
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
 * LLM連携フック（統合版）
 */
export function useLLM(options: UseLLMOptions = {}): UseLLMReturn {
  const { provider: defaultProvider, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  
  // ストリーム状態（useLLMStreamから統合）
  const [streamState, setStreamState] = useState<StreamState>({
    content: '',
    thinking: '',
    isComplete: true,
    error: null,
    usage: null,
  });
  
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
   * ストリームをリセット
   */
  const resetStream = useCallback(() => {
    setStreamState({
      content: '',
      thinking: '',
      isComplete: true,
      error: null,
      usage: null,
    });
  }, []);

  /**
   * ストリームをキャンセル
   */
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setStreamState(prev => ({ ...prev, isComplete: true }));
  }, []);

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
          provider: defaultProvider,
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
  }, [defaultProvider, handleError]);

  /**
   * ストリーミングチャット（低レベルAPI）
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
          provider: defaultProvider,
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

      let content = '';
      let finalUsage: UsageInfo | undefined;

      for await (const event of parseSSEStream(reader)) {
        if (event.error) {
          throw new Error(event.error);
        }

        if (event.content) {
          content += event.content;
          onChunk(event.content);
        }

        if (event.done && event.usage) {
          finalUsage = event.usage;
          setLastUsage(event.usage);
        }
      }

      return { content, usage: finalUsage };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      handleError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [defaultProvider, handleError]);

  /**
   * ストリームを開始（高レベルAPI - useLLMStreamから統合）
   */
  const startStream = useCallback(async (
    messages: LLMMessage[],
    provider?: LLMProvider,
    toolOptions?: { enableWebSearch?: boolean }
  ): Promise<void> => {
    const targetProvider = provider || defaultProvider;
    if (!targetProvider) {
      throw new Error('Provider is required');
    }

    // ストリーム状態をリセット
    setStreamState({
      content: '',
      thinking: '',
      isComplete: false,
      error: null,
      usage: null,
    });

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
          provider: targetProvider,
          toolOptions,
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

      for await (const event of parseSSEStream(reader)) {
        if (event.error) {
          throw new Error(event.error);
        }

        if (event.content) {
          setStreamState(prev => ({
            ...prev,
            content: prev.content + event.content!,
          }));
        }

        if (event.thinking) {
          setStreamState(prev => ({
            ...prev,
            thinking: prev.thinking + event.thinking!,
          }));
        }

        if (event.done) {
          setStreamState(prev => ({
            ...prev,
            isComplete: true,
            usage: event.usage ?? null,
          }));
          if (event.usage) {
            setLastUsage(event.usage);
          }
        }
      }

      setStreamState(prev => ({ ...prev, isComplete: true }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStreamState(prev => ({ ...prev, isComplete: true }));
      } else {
        const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
        setStreamState(prev => ({
          ...prev,
          error: errorMessage,
          isComplete: true,
        }));
        handleError(errorMessage);
      }
    }
  }, [defaultProvider, handleError]);

  return {
    chat,
    streamChat,
    streamState,
    startStream,
    cancelStream,
    resetStream,
    isLoading,
    error,
    lastUsage,
  };
}
