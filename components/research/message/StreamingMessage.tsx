"use client";

import { useRef, useEffect } from "react";
import { Loader2, Lightbulb } from "lucide-react";
import { LLMProvider } from "@/lib/llm/types";

interface StreamingMessageProps {
  content: string;
  thinking: string;
  isThinking?: boolean;
  provider: LLMProvider;
}

export function StreamingMessage({
  content,
  thinking,
  provider,
}: StreamingMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [content, thinking]);

  return (
    <div className="flex gap-4" ref={contentRef}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[85%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 justify-start">
          <span className="text-sm font-medium text-gray-300">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            生成中
          </span>
        </div>

        {/* Thinking Process */}
        {thinking && (
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

        {/* Message Content */}
        <div className="relative px-4 py-3 text-sm leading-relaxed bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm">
          {content ? (
            <div className="whitespace-pre-wrap">
              {content}
              <span className="inline-block w-2 h-4 bg-black ml-1 animate-pulse rounded-sm" />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-400 py-1">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
              <span className="text-xs">考え中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
