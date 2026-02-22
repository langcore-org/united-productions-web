/**
 * レガシー思考メッセージコンポーネント
 * 
 * @created 2026-02-22 11:50
 */

import { BrainCircuit, Sparkles } from "lucide-react";
import type { LegacyThinkingMessageProps } from "../types";

export function LegacyThinkingMessage({ thinking, provider, isComplete }: LegacyThinkingMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg">
        {!isComplete ? (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-white" />
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
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              思考中...
            </span>
          )}
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-sm">
          <p className="whitespace-pre-wrap text-xs">{thinking}</p>
        </div>
      </div>
    </div>
  );
}

export default LegacyThinkingMessage;
