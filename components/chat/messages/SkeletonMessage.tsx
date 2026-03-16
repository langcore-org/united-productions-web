/**
 * スケルトンメッセージコンポーネント
 *
 * LLM応答待ち中のプレースホルダー表示
 *
 * @created 2026-02-27
 */

import { Loader2 } from "lucide-react";
import { TeddyIcon } from "@/components/icons/TeddyIcon";

interface SkeletonMessageProps {
  showHeader?: boolean;
}

export function SkeletonMessage({ showHeader = true }: SkeletonMessageProps) {
  const messageContent = (
    <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-sm">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-gray-500 text-sm">入力中...</span>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );

  if (!showHeader) {
    return messageContent;
  }

  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
        <TeddyIcon size={36} className="rounded-none" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
            生成中...
          </span>
        </div>
        {messageContent}
      </div>
    </div>
  );
}

export default SkeletonMessage;
