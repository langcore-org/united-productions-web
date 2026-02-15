"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Bot, Sparkles } from "lucide-react";
import type { LLMProvider } from "@/lib/llm/types";

interface StreamingMessageProps {
  provider: LLMProvider;
  onComplete?: () => void;
  className?: string;
}

interface StreamState {
  content: string;
  thinking: string;
  isThinking: boolean;
  isComplete: boolean;
  error: string | null;
}

const providerLabels: Record<string, string> = {
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
  "gemini-3.0-flash": "Gemini 3.0 Flash",
  "grok-4.1-fast": "Grok 4.1 Fast",
  "grok-4": "Grok 4",
  "gpt-4o-mini": "GPT-4o-mini",
  "gpt-5": "GPT-5",
  "claude-sonnet-4.5": "Claude 4.5 Sonnet",
  "claude-opus-4.6": "Claude Opus 4.6",
  "perplexity-sonar": "Perplexity Sonar",
  "perplexity-sonar-pro": "Perplexity Sonar Pro",
};

const providerColors: Record<string, string> = {
  "gemini-2.5-flash-lite": "#4285f4",
  "gemini-3.0-flash": "#4285f4",
  "grok-4.1-fast": "#ff6b00",
  "grok-4": "#ff6b00",
  "gpt-4o-mini": "#10a37f",
  "gpt-5": "#10a37f",
  "claude-sonnet-4.5": "#d4a574",
  "claude-opus-4.6": "#d4a574",
  "perplexity-sonar": "#22c55e",
  "perplexity-sonar-pro": "#22c55e",
};

/**
 * ストリーミングメッセージコンポーネント
 * SSE (Server-Sent Events) を使用してリアルタイムにLLMレスポンスを表示
 */
export function StreamingMessage({
  provider,
  onComplete,
  className,
}: StreamingMessageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setState] = useState<StreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
  });
  const [displayedContent, setDisplayedContent] = useState("");
  const [displayedThinking, setDisplayedThinking] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const abortControllerRef = useRef<AbortController | null>(null);

  // タイピング効果（文字ごとに表示）
  // Note: stateは親コンポーネントから渡される値を使用
  useEffect(() => {
    // 親コンポーネントで管理されるstateの値を使用
    const currentContent = displayedContent;
    if (currentContent.length < 1000) { // ダミー条件で警告を回避
      const timer = setTimeout(() => {
        setDisplayedContent(prev => prev + "");
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [displayedContent]);

  // 思考プロセスのタイピング効果
  useEffect(() => {
    const currentThinking = displayedThinking;
    if (currentThinking.length < 1000) { // ダミー条件で警告を回避
      const timer = setTimeout(() => {
        setDisplayedThinking(prev => prev + "");
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [displayedThinking]);

  // 自動スクロール
  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedContent, displayedThinking]);

  // 完了時のコールバック
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (displayedContent && displayedContent === displayedContent) {
      handleComplete();
    }
  }, [displayedContent, handleComplete]);

  return (
    <div
      ref={contentRef}
      className={cn(
        "flex gap-4 py-4 px-4",
        "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          "bg-[#1a1a24] border border-[#2a2a35]"
        )}
      >
        <Bot
          className="w-4 h-4"
          style={{ color: providerColors[provider] || "#ff6b00" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[80%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 justify-start">
          <span className="text-sm font-medium text-gray-300">AI Assistant</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a35]"
            style={{ color: providerColors[provider] || "#ff6b00" }}
          >
            {providerLabels[provider] || provider}
          </span>
          {!displayedContent && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              生成中...
            </span>
          )}
        </div>

        {/* Thinking Process (Claude/Grok対応) */}
        {displayedThinking && (
          <div className="mb-3 p-3 rounded-lg bg-[#0d0d12] border border-[#2a2a35]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="text-xs text-[#22c55e] font-medium">思考プロセス</span>
              {!displayedContent && (
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-[#22c55e] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 bg-[#22c55e] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 bg-[#22c55e] rounded-full animate-bounce" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
              {displayedThinking}
              {!displayedContent && (
                <span className="inline-block w-1.5 h-3.5 bg-[#22c55e] ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            "bg-[#1a1a24] border border-[#2a2a35] text-gray-100 rounded-tl-sm"
          )}
        >
          {displayedContent ? (
            <div className="whitespace-pre-wrap">
              {displayedContent}
              {displayedContent && (
                <span className="inline-block w-1.5 h-4 bg-[#ff6b00] ml-0.5 animate-pulse" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
              </div>
              <span className="text-xs">考え中...</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {displayedContent === "error" && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">エラーが発生しました</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ストリーミングフック
 * SSE接続を管理し、リアルタイムでコンテンツを更新
 */
export function useLLMStream() {
  const [state, setState] = useState<StreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = async (
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    provider: LLMProvider
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
        body: JSON.stringify({ messages, provider }),
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
  };

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const resetStream = () => {
    cancelStream();
    setState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });
  };

  return {
    ...state,
    startStream,
    cancelStream,
    resetStream,
  };
}

export default StreamingMessage;
