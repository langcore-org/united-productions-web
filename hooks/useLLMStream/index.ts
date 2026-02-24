/**
 * useLLMStream Hook
 *
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * 新SSEイベント形式（discriminated union）に対応
 * Rolling Summary Memory統合版
 */

import { useCallback, useRef, useState } from "react";
import { LLMApiError, streamLLMResponse } from "@/lib/api/llm-client";
import { GrokClient } from "@/lib/llm/clients/grok";
import { ThresholdRollingSummaryMemory } from "@/lib/llm/memory/threshold-rolling-summary";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import type { FollowUpInfo, ToolCallInfo, UsageInfo } from "./types";

export type { FollowUpInfo, UsageInfo, ToolCallInfo };

export interface UseLLMStreamOptions {
  /** 要約開始閾値（トークン数）。デフォルト: 100000 */
  tokenThreshold?: number;
  /** 直近保持するターン数。デフォルト: 10 */
  maxRecentTurns?: number;
}

/**
 * useLLMStream Hook
 */
export function useLLMStream(options: UseLLMStreamOptions = {}) {
  const { tokenThreshold = 100_000, maxRecentTurns = 10 } = options;

  const [content, setContent] = useState("");
  const [isComplete, setIsComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpInfo>({
    questions: [],
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const memoryRef = useRef<ThresholdRollingSummaryMemory | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Memoryを初期化または取得
   */
  const getOrCreateMemory = useCallback(() => {
    if (!memoryRef.current) {
      memoryRef.current = new ThresholdRollingSummaryMemory({
        tokenThreshold,
        maxRecentTurns,
      });
    }
    return memoryRef.current;
  }, [tokenThreshold, maxRecentTurns]);

  /**
   * ストリームを開始
   * toolOptions は廃止 - 全ツール常時有効
   * @param programId - 番組ID（"all"または特定の番組ID）
   */
  const startStream = useCallback(
    async (messages: LLMMessage[], provider: LLMProvider, programId?: string): Promise<void> => {
      cleanup();

      setContent("");
      setIsComplete(false);
      setError(null);
      setUsage(null);
      setToolCalls([]);
      setFollowUp({ questions: [], isLoading: false, error: null });

      abortControllerRef.current = new AbortController();

      // Memoryを初期化し、メッセージをロード
      const memory = getOrCreateMemory();
      memory.clear(); // 新しい会話のためにクリア

      // GrokClientを作成（要約用）
      const grokClient = provider.startsWith("grok-") ? new GrokClient(provider) : undefined;

      // メッセージをMemoryに追加（要約が必要な場合は自動実行）
      await memory.addMessages(messages, grokClient);

      // 適切なコンテキストを取得（要約済み or 全履歴）
      const context = memory.getContext();

      // フォローアップ質問を生成
      const generateFollowUp = async () => {
        setFollowUp({ questions: [], isLoading: true, error: null });

        try {
          const response = await fetch("/api/llm/follow-up", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: context.messages, provider, programId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error: ${response.status}`);
          }

          const data = (await response.json()) as { questions: string[] };
          setFollowUp({
            questions: data.questions || [],
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to generate follow-up";
          setFollowUp({
            questions: [],
            isLoading: false,
            error: errorMessage,
          });
        }
      };

      try {
        for await (const event of streamLLMResponse(
          { messages: context.messages, provider, programId },
          { signal: abortControllerRef.current.signal },
        )) {
          switch (event.type) {
            case "start":
              // ストリーム開始 - 何もしない
              break;

            case "content":
              setContent((prev) => prev + event.delta);
              break;

            case "tool_call":
              setToolCalls((prev) => {
                const existing = prev.findIndex((t) => t.id === event.id);
                const info: ToolCallInfo = {
                  id: event.id,
                  name: event.name,
                  displayName: event.displayName,
                  status: event.status,
                  input: event.input,
                };
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = { ...updated[existing], ...info };
                  return updated;
                }
                return [...prev, info];
              });
              break;

            case "done":
              setUsage(event.usage);
              setIsComplete(true);
              // ストリーミング完了後、フォローアップ質問を生成
              generateFollowUp();
              break;

            case "error":
              throw new Error(event.message);
          }
        }
        setIsComplete(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setIsComplete(true);
        } else {
          const errorMessage =
            err instanceof LLMApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "予期しないエラーが発生しました";
          setError(errorMessage);
          setIsComplete(true);
        }
      }
    },
    [cleanup, getOrCreateMemory],
  );

  const cancelStream = useCallback(() => {
    cleanup();
    setIsComplete(true);
  }, [cleanup]);

  const resetStream = useCallback(() => {
    cleanup();
    setContent("");
    setIsComplete(true);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setFollowUp({ questions: [], isLoading: false, error: null });
    // Memoryもクリア
    memoryRef.current?.clear();
    memoryRef.current = null;
  }, [cleanup]);

  /**
   * Memoryの状態を取得（デバッグ用）
   */
  const getMemoryStatus = useCallback(() => {
    return memoryRef.current?.getStatus();
  }, []);

  return {
    content,
    isComplete,
    error,
    usage,
    toolCalls,
    followUp,
    startStream,
    cancelStream,
    resetStream,
    getMemoryStatus,
  };
}

export default useLLMStream;
