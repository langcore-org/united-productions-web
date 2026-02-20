"use client";

import { cn } from "@/lib/utils";
import { Bot, User, Lightbulb } from "lucide-react";
import { ChatMessage as ChatMessageType } from "./types";
import { ResearchMessage } from "@/types/research";

interface ChatMessageProps {
  message: ChatMessageType | ResearchMessage;
  showThinking?: boolean;
  showCitations?: boolean;
}

export function ChatMessage({ message, showThinking = true, showCitations = true }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          isUser
            ? "bg-gray-100 border border-gray-200"
            : "bg-gradient-to-br from-black to-gray-800 shadow-lg"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-700" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 mb-1.5",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className={cn("text-sm font-medium", isUser ? "text-gray-700" : "text-gray-600")}>
            {isUser ? "You" : "AI Assistant"}
          </span>
          {!isUser && message.llmProvider && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              {message.llmProvider}
            </span>
          )}
        </div>

        {/* Thinking Process */}
        {!isUser && showThinking && message.thinking && (
          <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">思考プロセス</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
              {message.thinking}
            </p>
          </div>
        )}

        {/* Citations */}
        {!isUser && showCitations && message.citations && message.citations.length > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600 font-medium mb-2">情報源</p>
            <ul className="space-y-1">
              {message.citations.map((citation, index) => (
                <li key={index} className="text-xs text-gray-600 truncate">
                  [{index + 1}] {citation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative px-4 py-3 text-sm leading-relaxed rounded-2xl",
            isUser
              ? "bg-black text-white rounded-tr-sm"
              : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </div>
  );
}
