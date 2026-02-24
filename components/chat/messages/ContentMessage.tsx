/**
 * メインコンテンツメッセージコンポーネント
 *
 * @created 2026-02-22 11:50
 */

import { Bot, Loader2 } from "lucide-react";
import type { ContentMessageProps } from "../types";
import { ToolUsageSummary } from "./ToolUsageSummary";

export function ContentMessage({
  content,
  provider,
  isComplete,
  toolUsage,
  usage,
}: ContentMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
        {isComplete ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        )}
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          {!isComplete && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
              生成中...
            </span>
          )}
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
          {content ? (
            <div className="whitespace-pre-wrap">
              {content}
              {!isComplete && (
                <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
              )}
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

        {/* Usage Info & Tool Usage Summary */}
        {isComplete && (usage || toolUsage) && (
          <div className="mt-2 space-y-1">
            {usage && (
              <div className="text-xs text-gray-400">
                {usage.inputTokens.toLocaleString()} 入力 / {usage.outputTokens.toLocaleString()}{" "}
                出力 • ${usage.cost.toFixed(6)}
              </div>
            )}
            <ToolUsageSummary toolUsage={toolUsage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentMessage;
