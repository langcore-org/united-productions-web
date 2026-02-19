"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Meeting notes error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      
      <h2 className="text-xl font-semibold text-white mb-2">
        議事録機能の読み込みに失敗しました
      </h2>
      
      <p className="text-sm text-gray-400 text-center max-w-md mb-6">
        {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
      </p>
      
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6b00] text-white rounded-xl hover:bg-[#ff8533] transition-colors font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        再試行
      </button>
    </div>
  );
}
