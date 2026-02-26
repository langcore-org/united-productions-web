/**
 * useLLMStream Hook
 *
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * 新SSEイベント形式（discriminated union）に対応
 * ClientMemory統合版（サーバーサイドGrokClient非依存）
 *
 * @updated 2026-02-24: GrokClient直接依存を削除し、ClientMemory経由で要約
 * @updated 2026-02-26: StreamPhase enum導入・onSummarizationUpdateコールバックで要約状態をリアルタイム反映
 */

import { useCallback, useRef, useState } from "react";
import { LLMApiError, streamLLMResponse } from "@/lib/api/llm-client";
import { ClientMemory } from "@/lib/llm/memory/client-memory";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import type { FollowUpInfo, StreamPhase, SummarizationEvent, ToolCallInfo, UsageInfo } from "./types";

export type { FollowUpInfo, StreamPhase, SummarizationEvent, UsageInfo, ToolCallInfo };

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
  const [phase, setPhase] = useState<StreamPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [summarizationEvents, setSummarizationEvents] = useState<SummarizationEvent[]>([]);
  const [followUp, setFollowUp] = useState<FollowUpInfo>({
    questions: [],
    isLoading: false,
    error: null,
  });

  // phase から派生する互換プロパティ
  // - isPending: UI が「処理中」を表示すべき状態か
  // - isComplete: UI が「完了後」の表示（フォローアップ等）をすべき状態か
  const isPending = phase === "preparing" || phase === "streaming";
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
   * SummarizationEvent を upsert するヘルパー
   * ClientMemory のコールバックから呼ばれる
   */
  const upsertSummarizationEvent = useCallback((event: SummarizationEvent) => {
    setSummarizationEvents((prev) => {
      const existing = prev.findIndex((e) => e.id === event.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = event;
        return updated;
      }
      return [...prev, event];
    });
  }, []);

  /**
   * Memoryを初期化または取得
   * プロバイダーが変わった場合は新規作成し、コールバックを設定する
   */
  const getOrCreateMemory = useCallback(
    (provider: LLMProvider) => {
      if (!memoryRef.current || providerRef.current !== provider) {
        providerRef.current = provider;
        memoryRef.current = new ClientMemory(provider, {
          tokenThreshold,
          maxRecentTurns,
          onSummarizationUpdate: upsertSummarizationEvent,
        });
      }
      return memoryRef.current;
    },
    [tokenThreshold, maxRecentTurns, upsertSummarizationEvent],
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

      // preparing フェーズに移行（React は次の機会に再レンダリングできる）
      setPhase("preparing");
      setContent("");
      setError(null);
      setUsage(null);
      setToolCalls([]);
      setSummarizationEvents([]);
      setFollowUp({ questions: [], isLoading: false, error: null });

      abortControllerRef.current = new AbortController();

      // Memoryを初期化し、メッセージをロード
      // onSummarizationUpdate コールバック経由で要約の running/completed/error がリアルタイム反映される
      const memory = getOrCreateMemory(provider);
      memory.clear();

      await memory.addMessages(messages);

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
              // LLM がレスポンスを生成し始めた = streaming フェーズへ
              setPhase("streaming");
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
              setPhase("complete");
              // ストリーミング完了後、フォローアップ質問を生成（非同期で実行）
              void generateFollowUp();
              break;

            case "error":
              throw new Error(event.message);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setPhase("cancelled");
        } else {
          const errorMessage =
            err instanceof LLMApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "予期しないエラーが発生しました";
          setError(errorMessage);
          setPhase("error");
        }
      }
    },
    [cleanup, getOrCreateMemory],
  );

  const cancelStream = useCallback(() => {
    cleanup();
    setPhase("cancelled");
  }, [cleanup]);

  const resetStream = useCallback(() => {
    cleanup();
    setPhase("idle");
    setContent("");
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
    phase,
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
