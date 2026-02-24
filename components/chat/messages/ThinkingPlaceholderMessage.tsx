/**
 * 思考プレースホルダーメッセージコンポーネント
 *
 * @created 2026-02-22 11:50
 */

import { Loader2, Sparkles } from "lucide-react";
import type { ThinkingPlaceholderMessageProps } from "../types";

export function ThinkingPlaceholderMessage({ provider }: ThinkingPlaceholderMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
        <Sparkles className="w-4 h-4 text-white animate-pulse" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            考え中...
          </span>
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-purple-700">回答を準備しています</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingPlaceholderMessage;
