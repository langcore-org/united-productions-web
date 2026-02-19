"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  context: string;
}

/**
 * 共通化されたError Boundaryコンポーネント
 * アプリケーション全体で一貫したエラーUIを提供
 */
export function ErrorBoundary({ error, reset, context }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(`${context} error:`, error);
  }, [error, context]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {context}の読み込みに失敗しました
      </h2>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        再試行
      </button>
    </div>
  );
}
