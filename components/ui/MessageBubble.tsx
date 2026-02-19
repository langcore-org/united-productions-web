"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, User, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { PROVIDER_LABELS } from "@/lib/llm/constants";
import type { LLMProvider } from "@/lib/llm/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
  thinkingContent?: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  className?: string;
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  isThinking,
  thinkingContent,
  timestamp,
  llmProvider,
  className,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4 group",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
          isUser 
            ? "bg-gradient-to-br from-[#ff6b00] to-[#ff8533]" 
            : "bg-gradient-to-br from-[#2a2a35] to-[#1a1a24] border border-[#3a3a45]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-[#ff6b00]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
        {/* Header - ユーザー名/AI名 */}
        <div className={cn(
          "flex items-center gap-2 mb-1.5",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-sm font-medium text-gray-300">
            {isUser ? "あなた" : "AI Assistant"}
          </span>
          {llmProvider && !isUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a35] text-[#ff6b00] border border-[#3a3a45]">
              {PROVIDER_LABELS[llmProvider]}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-5 py-3.5 shadow-lg",
            isUser
              ? "bg-gradient-to-br from-[#ff6b00] to-[#ff8533] text-white rounded-tr-sm"
              : "bg-[#1e1e24] border border-[#2a2a35] text-gray-100 rounded-tl-sm hover:border-[#3a3a45] transition-colors"
          )}
        >
          {/* Copy Button (Assistant only) */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-[#2a2a35]/80 text-gray-400 
                         opacity-0 group-hover:opacity-100 hover:text-white hover:bg-[#3a3a45] 
                         transition-all duration-200"
              title="コピー"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Content */}
          {isUser ? (
            // ユーザーメッセージはプレーンテキスト
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            // AIメッセージはマークダウン
            <div className="text-sm leading-relaxed pr-6">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>

        {/* Meta Info - Timestamp */}
        <div
          className={cn(
            "flex items-center gap-2 mt-1.5",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-xs text-gray-500">
            {timestamp.toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="mt-2 flex items-center gap-2 text-[#22c55e]">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-bounce" />
            </div>
            <span className="text-xs">思考中...</span>
          </div>
        )}

        {/* Thinking Content (Collapsible) */}
        {thinkingContent && !isThinking && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1.5 text-xs text-[#22c55e] hover:text-[#4ade80] transition-colors"
            >
              {showThinking ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>思考プロセス</span>
            </button>
            {showThinking && (
              <div className="mt-2 p-3 rounded-lg bg-[#0d0d12] border border-[#2a2a35] text-xs text-gray-400 leading-relaxed">
                {thinkingContent}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;
