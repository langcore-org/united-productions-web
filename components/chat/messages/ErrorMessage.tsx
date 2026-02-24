/**
 * エラーメッセージコンポーネント
 *
 * @created 2026-02-23
 */

import { XCircle } from "lucide-react";

export interface ErrorMessageProps {
  error: string;
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-red-100 border border-red-200">
        <XCircle className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-red-600">エラー</span>
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-red-50 text-red-800 border border-red-200 rounded-tl-sm">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="font-medium">エラーが発生しました</span>
          </div>
          <p className="text-red-700/80 whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;
