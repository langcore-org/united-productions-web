/**
 * Word出力カスタムフック
 */

import { useState, useCallback } from "react";

interface UseWordExportOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseWordExportReturn {
  exportToWord: (content: string, filename?: string, title?: string) => Promise<void>;
  isExporting: boolean;
  error: Error | null;
}

export function useWordExport(options: UseWordExportOptions = {}): UseWordExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportToWord = useCallback(
    async (content: string, filename?: string, title?: string): Promise<void> => {
      setIsExporting(true);
      setError(null);

      try {
        const response = await fetch("/api/export/word", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            filename,
            title,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Word出力に失敗しました (${response.status})`
          );
        }

        // ファイル名取得
        const contentDisposition = response.headers.get("Content-Disposition");
        const match = contentDisposition?.match(/filename="?([^"]+)"?/);
        const downloadFilename = match?.[1] || "document.docx";

        // Blobとしてダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = decodeURIComponent(downloadFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        options.onSuccess?.();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Word出力に失敗しました");
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  return {
    exportToWord,
    isExporting,
    error,
  };
}
