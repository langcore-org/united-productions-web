"use client";

import { cn } from "@/lib/utils";
import { Bot, Lightbulb } from "lucide-react";
import { ChatStreamState } from "./types";

interface StreamingMessageProps {
  content: string;
  thinking?: string;
  showThinking?: boolean;
  provider?: string;
}

export function StreamingMessage({
  content,
  thinking,
  showThinking = true,
  provider,
}: StreamingMessageProps) {
  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
        <Bot className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[85%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          {provider && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              {provider}
            </span>
          )}
        </div>

        {/* Thinking Process */}
        {showThinking && thinking && (
          <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">思考プロセス</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
              {thinking}
            </p>
          </div>
        )}

        {/* Message Bubble */}
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
          <div className="whitespace-pre-wrap">
            {content}
            <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
