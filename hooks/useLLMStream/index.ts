/**
 * useLLMStream Hook
 *
 * LLMストリーミングAPIとの連携を行うカスタムフック
 * 新SSEイベント形式（discriminated union）に対応
 */

import { useCallback, useRef, useState } from "react";
import { LLMApiError, streamLLMResponse } from "@/lib/api/llm-client";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";
import type { ToolCallInfo, UsageInfo } from "./types";

export type { UsageInfo, ToolCallInfo };

/**
 * useLLMStream Hook
 */
export function useLLMStream() {
  const [content, setContent] = useState("");
  const [isComplete, setIsComplete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * ストリームを開始
   * toolOptions は廃止 - 全ツール常時有効
   */
  const startStream = useCallback(
    async (messages: LLMMessage[], provider: LLMProvider) => {
      cleanup();

      setContent("");
      setIsComplete(false);
      setError(null);
      setUsage(null);
      setToolCalls([]);

      abortControllerRef.current = new AbortController();

      try {
        for await (const event of streamLLMResponse(
          { messages, provider },
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
    [cleanup],
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
  }, [cleanup]);

  return {
    content,
    isComplete,
    error,
    usage,
    toolCalls,
    startStream,
    cancelStream,
    resetStream,
  };
}

export default useLLMStream;
