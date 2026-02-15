"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

export type LLMProvider = 
  | "gemini-25-flash-lite"
  | "gemini-30-flash"
  | "grok-41-fast"
  | "grok-4"
  | "gpt-4o-mini"
  | "gpt-5"
  | "claude-sonnet-45"
  | "claude-opus-46"
  | "perplexity-sonar"
  | "perplexity-sonar-pro";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isThinking?: boolean;
  thinkingContent?: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  className?: string;
}

const providerLabels: Record<LLMProvider, string> = {
  "gemini-25-flash-lite": "Gemini 2.5 Flash-Lite",
  "gemini-30-flash": "Gemini 3.0 Flash",
  "grok-41-fast": "Grok 4.1 Fast",
  "grok-4": "Grok 4",
  "gpt-4o-mini": "GPT-4o-mini",
  "gpt-5": "GPT-5",
  "claude-sonnet-45": "Claude 4.5 Sonnet",
  "claude-opus-46": "Claude Opus 4.6",
  "perplexity-sonar": "Perplexity Sonar",
  "perplexity-sonar-pro": "Perplexity Sonar Pro",
};

export function MessageBubble({
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
        "flex gap-4 py-4 px-4",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-[#3b82f6]" : "bg-[#1a1a24] border border-[#2a2a35]"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-[#ff6b00]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 mb-1",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-sm font-medium text-gray-300">
            {isUser ? "ユーザー" : "AI Assistant"}
          </span>
          {llmProvider && !isUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a35] text-[#ff6b00]">
              {providerLabels[llmProvider]}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {timestamp.toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-[#3b82f6] text-white rounded-tr-sm"
              : "bg-[#1a1a24] border border-[#2a2a35] text-gray-100 rounded-tl-sm"
          )}
        >
          {content}
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
}
