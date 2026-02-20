"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { StreamingMessage } from "@/components/ui/StreamingMessage";
import type { ChatMessage as ChatMessageType, ChatUIProps } from "./types";

export function ChatUI({
  messages,
  input,
  setInput,
  isLoading,
  isStreaming,
  streamState,
  provider,
  config = {},
  emptyStateProps,
  headerContent,
  onSubmit,
  onCancel,
  onKeyDown,
  className,
}: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { placeholder, showThinking = true, showCitations = true } = config;

  // メッセージ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState?.content, streamState?.thinking]);

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      {headerContent && (
        <header className="flex-none border-b border-gray-200 bg-white p-4">
          {headerContent}
        </header>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {showEmptyState ? (
          <EmptyState {...emptyStateProps} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                showThinking={showThinking}
                showCitations={showCitations}
              />
            ))}

            {/* Streaming Message */}
            {isStreaming && streamState && (
              <StreamingMessage
                content={streamState.content}
                thinking={streamState.thinking}
                showThinking={showThinking}
                provider={provider}
              />
            )}

            {/* Error Message */}
            {streamState?.error && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-600">エラー</span>
                  </div>
                  <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-gray-100 text-gray-800 border border-gray-200 rounded-tl-sm">
                    <div className="whitespace-pre-wrap">{streamState.error}</div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isStreaming={isStreaming}
        placeholder={placeholder}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
