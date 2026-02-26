/**
 * useLLMStream Hook
 *
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * 新SSEイベント形式（discriminated union）に対応
 * ClientMemory統合版（サーバーサイドGrokClient非依存）
 *
 * @updated 2026-02-24: GrokClient直接依存を削除し、ClientMemory経由で要約
 */

import { useCallback, useRef, useState } from "react";
import { LLMApiError, streamLLMResponse } from "@/lib/api/llm-client";
import { ClientMemory } from "@/lib/llm/memory/client-memory";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import type { FollowUpInfo, SummarizationEvent, ToolCallInfo, UsageInfo } from "./types";

export type { FollowUpInfo, SummarizationEvent, UsageInfo, ToolCallInfo };

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
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [summarizationEvents, setSummarizationEvents] = useState<SummarizationEvent[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpInfo>({
    questions: [],
    isLoading: false,
    error: null,
  });

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
      // プロバイダーが変わった場合は新規作成
      if (!memoryRef.current || providerRef.current !== provider) {
        providerRef.current = provider;
        memoryRef.current = new ClientMemory(provider, {
          tokenThreshold,
          maxRecentTurns,
        });
      }
      return memoryRef.current;
    },
    [tokenThreshold, maxRecentTurns],
  );

  /**
   * ストリームを開始
   * toolOptions は廃止 - 全ツール常時有効
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

      setIsPending(true);
      setContent("");
      setIsComplete(false);
      setError(null);
      setUsage(null);
      setToolCalls([]);
      setFollowUp({ questions: [], isLoading: false, error: null });

      abortControllerRef.current = new AbortController();

      // Memoryを初期化し、メッセージをロード
      const memory = getOrCreateMemory(provider);
      memory.clear(); // 新しい会話のためにクリア
      setSummarizationEvents([]); // 要約イベントをリセット

      // ClientMemoryは内部でAPI経由で要約を実行
      await memory.addMessages(messages);

      // 要約イベントを取得
      const history = memory.getSummarizationHistory();
      setSummarizationEvents(history);

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
          { messages: context.messages, provider, featureId, programId },
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
              setIsPending(false);
              // ストリーミング完了後、フォローアップ質問を生成（非同期で実行）
              void generateFollowUp();
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
    setIsPending(false);
    setError(null);
    setUsage(null);
    setToolCalls([]);
    setSummarizationEvents([]);
    setFollowUp({ questions: [], isLoading: false, error: null });
    // Memoryもクリア
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
    content,
    isComplete,
    isPending,
    error,
    usage,
    toolCalls,
    summarizationEvents,
    followUp,
    startStream,
    cancelStream,
    resetStream,
    getMemoryStatus,
  };
}

export default useLLMStream;
