"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">エラーが発生しました</h2>
        </div>

        <p className="text-gray-500 mb-6">{error.message || "予期しないエラーが発生しました。"}</p>

        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition-all duration-200"
        >
          <RefreshCcw className="w-4 h-4" />
          再試行
        </button>
      </div>
    </div>
  );
}
