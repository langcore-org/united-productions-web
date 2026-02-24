/**
 * 新しい思考ステップメッセージコンポーネント
 * 
 * @created 2026-02-22 11:50
 */

import { Loader2, BrainCircuit, Sparkles, Search, CheckCircle2, Bot } from "lucide-react";
import type { NewThinkingStepMessageProps } from "../types";

const typeColors: Record<string, string> = {
  thinking: 'bg-purple-50 text-purple-900 border-purple-200',
  search: 'bg-blue-50 text-blue-900 border-blue-200',
  analysis: 'bg-amber-50 text-amber-900 border-amber-200',
  synthesis: 'bg-green-50 text-green-900 border-green-200',
  complete: 'bg-gray-50 text-gray-900 border-gray-200',
};

const typeIcons: Record<string, React.ElementType> = {
  thinking: BrainCircuit,
  search: Search,
  analysis: Sparkles,
  synthesis: CheckCircle2,
  complete: Bot,
};

export function NewThinkingStepMessage({ step, provider, isActive }: NewThinkingStepMessageProps) {
  const Icon = typeIcons[step.type] || BrainCircuit;

  return (
    <div className="flex gap-4 px-4 py-2">
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
        isActive ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-gray-600 to-gray-800'
      }`}>
        {isActive ? (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        ) : (
          <Icon className="w-4 h-4 text-white" />
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
        <div className={`relative px-4 py-3 text-sm leading-relaxed rounded-2xl border rounded-tl-sm ${typeColors[step.type] || typeColors.thinking}`}>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/50 flex items-center justify-center text-xs font-medium">
              {step.step}
            </span>
            <div className="flex-1">
              <p className="font-medium mb-1">{step.title}</p>
              {step.content && (
                <p className="whitespace-pre-wrap text-sm opacity-80">{step.content}</p>
              )}
              {isActive && !step.content && (
                <div className="flex items-center gap-2 text-xs opacity-60">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>処理中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewThinkingStepMessage;
