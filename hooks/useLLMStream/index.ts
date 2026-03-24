/**
 * useLLMStream Hook
 *
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * 新SSEイベント形式（discriminated union）に対応
 * ClientMemory統合版（サーバーサイドGrokClient非依存）
 *
 * @updated 2026-02-24: GrokClient直接依存を削除し、ClientMemory経由で要約
 * @updated 2026-02-26: StreamPhase enum導入・onSummarizationUpdateコールバックで要約状態をリアルタイム反映
 * @updated 2026-03-24: 9個のuseStateをuseReducerに統合（B-3リファクタリング）
 */

import { useCallback, useReducer, useRef } from "react";
import { LLMApiError, streamLLMResponse } from "@/lib/api/llm-client";
import { ClientMemory } from "@/lib/llm/memory/client-memory";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import { initialStreamState, streamReducer } from "./reducer";
import type {
  CitationInfo,
  ConnectionStatus,
  FollowUpInfo,
  StreamPhase,
  SummarizationEvent,
  ToolCallInfo,
  UsageInfo,
  UseLLMStreamOptions,
} from "./types";

export type {
  CitationInfo,
  ConnectionStatus,
  FollowUpInfo,
  StreamPhase,
  SummarizationEvent,
  UsageInfo,
  ToolCallInfo,
  UseLLMStreamOptions,
};

/**
 * useLLMStream Hook
 */
export function useLLMStream(options: UseLLMStreamOptions = {}) {
  const { tokenThreshold = 100_000, maxRecentTurns = 10 } = options;

  const [state, dispatch] = useReducer(streamReducer, initialStreamState);

  // phase から派生する互換プロパティ
  const isPending = state.phase === "preparing" || state.phase === "streaming";
  const isComplete = !isPending;

  const abortControllerRef = useRef<AbortController | null>(null);
  const memoryRef = useRef<ClientMemory | null>(null);
  const providerRef = useRef<LLMProvider | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Memoryを初期化または取得
   */
  const getOrCreateMemory = useCallback(
    (provider: LLMProvider) => {
      if (!memoryRef.current || providerRef.current !== provider) {
        providerRef.current = provider;
        memoryRef.current = new ClientMemory(provider, {
          tokenThreshold,
          maxRecentTurns,
          onSummarizationUpdate: (event) =>
            dispatch({ type: "UPSERT_SUMMARIZATION_EVENT", event }),
        });
      }
      return memoryRef.current;
    },
    [tokenThreshold, maxRecentTurns],
  );

  /**
   * ストリームを開始
   * @param featureId - 機能ID（例: research-cast, proposal）
   * @param programId - 番組ID（"all"または特定の番組ID）
   */
  const startStream = useCallback(
    async (
      messages: LLMMessage[],
      provider: LLMProvider,
      featureId?: string,
      programId?: string,
    ): Promise<void> => {
      cleanup();

      dispatch({ type: "PREPARE" });
      abortControllerRef.current = new AbortController();

      // Memoryを初期化し、メッセージをロード
      const memory = getOrCreateMemory(provider);
      memory.clear();
      await memory.addMessages(messages);

      // 適切なコンテキストを取得（要約済み or 全履歴）
      const context = memory.getContext();

      // フォローアップ質問を生成
      const generateFollowUp = async () => {
        dispatch({
          type: "SET_FOLLOW_UP",
          followUp: { questions: [], isLoading: true, error: null },
        });

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
          dispatch({
            type: "SET_FOLLOW_UP",
            followUp: { questions: data.questions || [], isLoading: false, error: null },
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to generate follow-up";
          dispatch({
            type: "SET_FOLLOW_UP",
            followUp: { questions: [], isLoading: false, error: errorMessage },
          });
        }
      };

      try {
        for await (const event of streamLLMResponse(
          { messages: context.messages, provider, featureId, programId },
          { signal: abortControllerRef.current.signal },
        )) {
          switch (event.type) {
            case "start":
              dispatch({ type: "START_STREAMING" });
              break;

            case "content":
              dispatch({ type: "APPEND_CONTENT", delta: event.delta });
              break;

            case "tool_call":
              dispatch({
                type: "UPSERT_TOOL_CALL",
                toolCall: {
                  id: event.id,
                  name: event.name,
                  displayName: event.displayName,
                  status: event.status,
                  input: event.input,
                },
              });
              break;

            case "citation":
              dispatch({
                type: "ADD_CITATION",
                citation: { url: event.url, title: event.title },
              });
              break;

            case "status":
              dispatch({
                type: "SET_CONNECTION_STATUS",
                status: { status: event.status, message: event.message || "" },
              });
              break;

            case "done":
              dispatch({ type: "COMPLETE", usage: event.usage });
              void generateFollowUp();
              break;

            case "error":
              throw new Error(event.message);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          dispatch({ type: "CANCEL" });
        } else {
          const errorMessage =
            err instanceof LLMApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "予期しないエラーが発生しました";
          dispatch({ type: "SET_ERROR", message: errorMessage });
        }
      }
    },
    [cleanup, getOrCreateMemory],
  );

  const cancelStream = useCallback(() => {
    cleanup();
    dispatch({ type: "CANCEL" });
  }, [cleanup]);

  const resetStream = useCallback(() => {
    cleanup();
    dispatch({ type: "RESET" });
    memoryRef.current?.clear();
    memoryRef.current = null;
    providerRef.current = null;
  }, [cleanup]);

  /**
   * Memoryの状態を取得（デバッグ用）
   */
  const getMemoryStatus = useCallback(() => {
    return memoryRef.current?.getStatus();
  }, []);

  return {
    content: state.content,
    phase: state.phase,
    isComplete,
    isPending,
    error: state.error,
    usage: state.usage,
    toolCalls: state.toolCalls,
    citations: state.citations,
    summarizationEvents: state.summarizationEvents,
    followUp: state.followUp,
    connectionStatus: state.connectionStatus,
    startStream,
    cancelStream,
    resetStream,
    getMemoryStatus,
  };
}

export default useLLMStream;
