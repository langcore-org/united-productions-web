"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { PROVIDER_LABELS } from "@/lib/llm/constants";
import type { LLMProvider } from "@/lib/llm/types";

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

  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser 
            ? "bg-[#ff6b00]" 
            : "bg-[#1a1a24] border border-[#2a2a35]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-[#ff6b00]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[75%]", isUser ? "items-end" : "items-start")}>
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-[#ff6b00] text-white rounded-tr-sm"
              : "bg-[#1a1a24] border border-[#2a2a35] text-gray-100 rounded-tl-sm"
          )}
        >
          {content}
        </div>

        {/* Meta Info - Timestamp & Provider */}
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
          {llmProvider && !isUser && (
            <span className="text-xs text-[#ff6b00]">
              · {PROVIDER_LABELS[llmProvider]}
            </span>
          )}
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
          <div className="mt-2 p-3 rounded-lg bg-[#0d0d12] border border-[#2a2a35]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
              <span className="text-xs text-[#22c55e] font-medium">思考プロセス</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{thinkingContent}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageBubble;
