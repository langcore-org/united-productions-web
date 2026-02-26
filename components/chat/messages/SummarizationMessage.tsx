/**
 * 要約メッセージコンポーネント
 *
 * 文脈の要約処理状態を表示
 *
 * @created 2026-02-24
 * @updated 2026-02-27 showHeaderオプションを追加
 */

import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import type { SummarizationMessageProps } from "../types";

export function SummarizationMessage({ event, provider, showHeader = true }: SummarizationMessageProps) {
  const getIcon = () => {
    switch (event.status) {
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-amber-600" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (event.status) {
      case "running":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "completed":
        return "bg-green-50 border-green-200 text-green-900";
      case "error":
        return "bg-red-50 border-red-200 text-red-900";
      default:
        return "bg-gray-50 border-gray-200 text-gray-900";
    }
  };

  const messageContent = (
    <div
      className={`relative px-4 py-3 text-sm leading-relaxed rounded-2xl rounded-tl-sm border ${getBgColor()}`}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="font-medium">{event.displayName}</span>
        {event.status === "running" && event.targetMessageCount > 0 && (
          <span className="text-amber-700/70 text-xs">({event.targetMessageCount}件のメッセージ)</span>
        )}
      </div>
      {event.error && <div className="mt-1 text-xs text-red-600">{event.error}</div>}
    </div>
  );

  // ヘッダーなし
  if (!showHeader) {
    return messageContent;
  }

  // ヘッダーあり
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg">
        <FileText className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
        </div>
        {messageContent}
      </div>
    </div>
  );
}

export default SummarizationMessage;
