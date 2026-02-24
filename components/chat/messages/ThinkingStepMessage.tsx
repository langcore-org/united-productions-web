/**
 * 思考ステップメッセージコンポーネント（レガシー）
 *
 * @created 2026-02-22 11:50
 */

import { BrainCircuit, Sparkles } from "lucide-react";
import type { ThinkingStepMessageProps } from "../types";

export function ThinkingStepMessage({
  step,
  provider,
  isActive,
  stepNumber,
}: ThinkingStepMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
        {isActive ? (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-white" />
        )}
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              思考中...
            </span>
          )}
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-sm">
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
              {step.step}
            </span>
            <p className="whitespace-pre-wrap">{step.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingStepMessage;
