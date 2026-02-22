/**
 * useLLMStream Hook
 * 
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * usage情報、ツール使用状況、思考ステップをサーバーから受信して表示
 * 
 * @created 2026-02-22 11:55
 */

import { useState, useRef, useCallback } from 'react';
import type { LLMMessage, LLMProvider } from '@/lib/llm/types';
import { streamLLMResponse, LLMApiError } from '@/lib/api/llm-client';
import type {
  ToolOptions,
  UsageInfo,
  ToolCallInfo,
  ReasoningStepInfo,
  ToolUsageInfo,
  ThinkingStepInfo,
} from './types';

export type {
  ToolOptions,
  UsageInfo,
  ToolCallInfo,
  ReasoningStepInfo,
  ToolUsageInfo,
  ThinkingStepInfo,
};

/**
 * useLLMStream Hook
 */
export function useLLMStream() {
  const [content, setContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [isComplete, setIsComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [toolUsage, setToolUsage] = useState<ToolUsageInfo | null>(null);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStepInfo[]>([]);
  const [reasoningTokens, setReasoningTokens] = useState<number>(0);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStepInfo[]>([]);
  const [isAccepted, setIsAccepted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * クリーンアップ関数
   */
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * ストリームを開始
   */
  const startStream = useCallback(async (
    messages: LLMMessage[],
    provider: LLMProvider,
    toolOptions?: ToolOptions
  ) => {
    // 前回のストリームを確実にクリーンアップ
    cleanup();

    setContent('');
    setThinking('');
    setIsComplete(false);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setToolUsage(null);
    setReasoningSteps([]);
    setReasoningTokens(0);
    setThinkingSteps([]);
    setIsAccepted(false);

    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    console.log('[useLLMStream] Starting stream...');
    
    try {
      let eventCount = 0;
      for await (const event of streamLLMResponse(
        { messages, provider, toolOptions },
        { signal: abortControllerRef.current.signal },
      )) {
        eventCount++;
        console.log(`[useLLMStream] Event #${eventCount}:`, Object.keys(event));
        
        if (event.error) {
          console.error('[useLLMStream] Event error:', event.error);
          throw new Error(event.error);
        }

        // リクエスト受理イベント
        if (event.accepted) {
          console.log('[useLLMStream] Event: accepted');
          setIsAccepted(true);
        }

        // コンテンツチャンク
        if (event.content) {
          console.log('[useLLMStream] Event: content chunk');
          setContent((prev) => prev + event.content);
        }

        // レガシー思考プロセス
        if (event.thinking) {
          setThinking((prev) => prev + event.thinking);
        }

        // レガシーツール呼び出し
        if (event.toolCall) {
          setToolCalls((prev) => {
            const existing = prev.findIndex(t => t.id === event.toolCall!.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...event.toolCall };
              return updated;
            }
            return [...prev, event.toolCall!];
          });
        }

        // レガシー思考ステップ
        if (event.reasoning) {
          setReasoningSteps((prev) => {
            const existing = prev.findIndex(r => r.step === event.reasoning!.step);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...event.reasoning };
              return updated;
            }
            return [...prev, event.reasoning!];
          });
          if (event.reasoning.tokens) {
            setReasoningTokens(event.reasoning.tokens);
          }
        }

        // 新しい思考ステップ開始
        if (event.stepStart) {
          setThinkingSteps((prev) => [...prev, event.stepStart!]);
        }

        // 思考ステップ更新
        if (event.stepUpdate) {
          setThinkingSteps((prev) =>
            prev.map((step) =>
              step.id === event.stepUpdate!.id
                ? { ...step, ...event.stepUpdate }
                : step
            )
          );
        }

        // ツール呼び出しイベント
        if (event.toolCallEvent) {
          setToolCalls((prev) => {
            const existing = prev.findIndex(t => t.id === event.toolCallEvent!.id);
            const toolCallInfo: ToolCallInfo = {
              id: event.toolCallEvent!.id,
              type: event.toolCallEvent!.type,
              name: event.toolCallEvent!.name,
              input: event.toolCallEvent!.input,
              status: event.toolCallEvent!.status,
            };
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { ...updated[existing], ...toolCallInfo };
              return updated;
            }
            return [...prev, toolCallInfo];
          });
        }

        // ツール使用状況
        if (event.toolUsage) {
          setToolUsage(event.toolUsage);
        }

        // 完了イベント
        if (event.done) {
          console.log('[useLLMStream] Event: done');
          setIsComplete(true);
          if (event.usage) {
            setUsage(event.usage);
          }
        }
      }
      console.log(`[useLLMStream] Stream ended, total events: ${eventCount}`);
      setIsComplete(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // キャンセルは正常
        setIsComplete(true);
      } else {
        const errorMessage = err instanceof LLMApiError
          ? err.message
          : err instanceof Error ? err.message : '予期しないエラーが発生しました';
        setError(errorMessage);
        setIsComplete(true);
      }
    }
  }, []);

  /**
   * ストリームをキャンセル
   */
  const cancelStream = useCallback(() => {
    cleanup();
    setIsComplete(true);
  }, [cleanup]);

  /**
   * ストリームをリセット
   */
  const resetStream = useCallback(() => {
    cleanup();
    setContent('');
    setThinking('');
    setIsComplete(true);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setToolUsage(null);
    setReasoningSteps([]);
    setReasoningTokens(0);
    setThinkingSteps([]);
    setIsAccepted(false);
  }, [cleanup]);

  return {
    content,
    thinking,
    isComplete,
    error,
    usage,
    toolCalls,
    toolUsage,
    reasoningSteps,
    reasoningTokens,
    thinkingSteps,
    isAccepted,
    startStream,
    cancelStream,
    resetStream,
  };
}

export default useLLMStream;
