/**
 * LangChain Chat Hook
 *
 * useLLMStream を内部的に使用し、メッセージ管理・送信・キャンセル等の
 * チャットUI向けインターフェースを提供するフック。
 *
 * ストリーム処理・SSEパース・ツール呼び出し・思考ステップは
 * すべて useLLMStream に委譲し、重複を排除している。
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LLMProvider } from '@/lib/llm/types';
import { useLLMStream, type ToolCallInfo, type ReasoningStepInfo, type ToolUsageInfo } from '@/hooks/useLLMStream';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UseLangChainChatOptions {
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface UseLangChainChatReturn {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
  toolCalls: ToolCallInfo[];
  reasoningSteps: ReasoningStepInfo[];
  toolUsage: ToolUsageInfo | null;
  streamingContent: string;
  thinking: string;
  isComplete: boolean;
  setInput: (input: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
}

/**
 * LangChainチャットフック
 *
 * useLLMStream を内部的に使用し、メッセージ管理を追加したラッパー。
 * SSEパース処理の重複を排除し、ツール呼び出し・思考ステップもサポート。
 */
export function useLangChainChat(options: UseLangChainChatOptions = {}): UseLangChainChatReturn {
  const {
    provider,
    systemPrompt,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  // useLLMStream に全ストリーム処理を委譲
  const {
    content,
    thinking,
    isComplete,
    error,
    toolCalls,
    toolUsage,
    reasoningSteps,
    startStream,
    cancelStream,
    resetStream,
  } = useLLMStream();

  const isLoading = !isComplete;
  const pendingAssistantIdRef = useRef<string | null>(null);

  // ストリーム完了時にメッセージリストに反映
  useEffect(() => {
    if (isComplete && content && pendingAssistantIdRef.current) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === pendingAssistantIdRef.current
            ? { ...msg, content }
            : msg
        )
      );
      pendingAssistantIdRef.current = null;
    }
  }, [isComplete, content]);

  /**
   * メッセージ送信
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || !isComplete) return;

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

    pendingAssistantIdRef.current = assistantMessage.id;
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');

    // リクエスト用メッセージ配列を構築
    const requestMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage.content },
    ];

    await startStream(requestMessages, provider || 'grok-4-1-fast-reasoning' as LLMProvider);
  }, [input, isComplete, messages, provider, systemPrompt, startStream]);

  /**
   * ストリーミング停止
   */
  const stop = useCallback(() => {
    cancelStream();
    if (pendingAssistantIdRef.current && content) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === pendingAssistantIdRef.current
            ? { ...msg, content }
            : msg
        )
      );
    }
    pendingAssistantIdRef.current = null;
  }, [cancelStream, content]);

  /**
   * 最後のメッセージを再送信
   */
  const reload = useCallback(async () => {
    if (messages.length < 2) return;

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // 最後のアシスタントメッセージを削除
    const lastAssistantIndex = messages.length - 1;
    if (messages[lastAssistantIndex]?.role !== 'assistant') return;

    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);
    resetStream();

    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
    };

    pendingAssistantIdRef.current = assistantMessage.id;
    setMessages(prev => [...prev, assistantMessage]);

    const requestMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...newMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    await startStream(requestMessages, provider || 'grok-4-1-fast-reasoning' as LLMProvider);
  }, [messages, provider, systemPrompt, startStream, resetStream]);

  return {
    messages,
    input,
    isLoading,
    error,
    toolCalls,
    reasoningSteps,
    toolUsage,
    streamingContent: content,
    thinking,
    isComplete,
    setInput,
    handleSubmit,
    stop,
    reload,
  };
}
