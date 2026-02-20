"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { Bot, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { LLMProvider } from "@/lib/llm/types";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/llm/constants";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface StreamingMessageProps {
  provider: LLMProvider;
  content?: string;
  thinking?: string;
  isComplete?: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * ストリーミングメッセージコンポーネント
 * SSE (Server-Sent Events) を使用してリアルタイムにLLMレスポンスを表示
 */
export const StreamingMessage = memo(function StreamingMessage({
  provider,
  content = "",
  thinking = "",
  isComplete = false,
  onComplete,
  className,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const [displayedThinking, setDisplayedThinking] = useState(thinking);
  const [showThinking, setShowThinking] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // 親から渡されたcontent/thinkingが変わったら表示を更新
  useEffect(() => {
    if (content !== displayedContent) {
      setDisplayedContent(content);
    }
  }, [content, displayedContent]);

  useEffect(() => {
    if (thinking !== displayedThinking) {
      setDisplayedThinking(thinking);
    }
  }, [thinking, displayedThinking]);

  // 自動スクロール
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedContent, displayedThinking]);

  // 完了時のコールバック
  const handleComplete = useCallback(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    handleComplete();
  }, [handleComplete]);

  const hasThinking = displayedThinking && displayedThinking.length > 0;
  const hasContent = displayedContent && displayedContent.length > 0;

  return (
    <div
      ref={contentRef}
      className={cn(
        "flex gap-3 py-4 px-4",
        "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
          "bg-gray-100 border border-gray-200"
        )}
      >
        <Bot
          className="w-4 h-4"
          style={{ color: PROVIDER_COLORS[provider] || "#b45309" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[80%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-700">AI Assistant</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200"
            style={{ color: PROVIDER_COLORS[provider] || "#b45309" }}
          >
            {PROVIDER_LABELS[provider] || provider}
          </span>
          {!isComplete && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              生成中...
            </span>
          )}
        </div>

        {/* Thinking Process */}
        {hasThinking && (
          <div className="mb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 transition-colors mb-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>思考プロセス</span>
              {showThinking ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              {!isComplete && (
                <div className="flex gap-1 ml-1">
                  <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 bg-green-600 rounded-full animate-bounce" />
                </div>
              )}
            </button>
            {showThinking && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {displayedThinking}
                  {!isComplete && (
                    <span className="inline-block w-1.5 h-3.5 bg-green-600 ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        {hasContent ? (
          <div
            className={cn(
              "rounded-2xl px-5 py-3.5 shadow-lg",
              "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
            )}
          >
            <div className="text-sm leading-relaxed">
              <MarkdownRenderer content={displayedContent} />
              {!isComplete && (
                <span className="inline-block w-1.5 h-4 bg-amber-700 ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-5 py-3.5",
              "bg-gray-50 border border-gray-200 text-gray-400 rounded-tl-sm"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
              </div>
              <span className="text-xs">考え中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface StreamState {
  content: string;
  thinking: string;
  isThinking: boolean;
  isComplete: boolean;
  error: string | null;
}

/**
 * ツールオプション
 */
export interface ToolOptions {
  enableWebSearch?: boolean;
}

interface UseLLMStreamReturn extends StreamState {
  startStream: (
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    provider: LLMProvider,
    toolOptions?: ToolOptions
  ) => Promise<void>;
  cancelStream: () => void;
  resetStream: () => void;
}

/**
 * ストリーミングフック
 * SSE接続を管理し、リアルタイムでコンテンツを更新
 */
export function useLLMStream(): UseLLMStreamReturn {
  const [state, setState] = useState<StreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    provider: LLMProvider,
    toolOptions?: ToolOptions
  ) => {
    // 既存の接続をキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 状態をリセット
    setState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/llm/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, provider, toolOptions }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          const data = trimmedLine.slice(6); // Remove 'data: ' prefix

          if (data === "[DONE]") {
            setState((prev) => ({ ...prev, isComplete: true }));
            return;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              setState((prev) => ({ ...prev, error: parsed.error }));
              return;
            }

            // 思考プロセスの処理（Claude/Grok対応）
            if (parsed.thinking) {
              setState((prev) => ({
                ...prev,
                thinking: prev.thinking + parsed.thinking,
                isThinking: true,
              }));
            }

            // コンテンツの処理
            if (parsed.content) {
              setState((prev) => ({
                ...prev,
                content: prev.content + parsed.content,
                isThinking: false,
              }));
            }
          } catch {
            // JSONパースエラーは無視
            continue;
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6);
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setState((prev) => ({
                  ...prev,
                  content: prev.content + parsed.content,
                }));
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      setState((prev) => ({ ...prev, isComplete: true }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ユーザーによるキャンセル
        return;
      }
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isComplete: true,
      }));
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const resetStream = useCallback(() => {
    cancelStream();
    setState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });
  }, [cancelStream]);

  return {
    ...state,
    startStream,
    cancelStream,
    resetStream,
  };
}

export default StreamingMessage;
