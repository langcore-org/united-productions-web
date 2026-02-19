/**
 * ファイルアップロードカスタムフック
 */

import { useState, useCallback } from "react";

interface UseFileUploadOptions {
  onSuccess?: (text: string, filename: string) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  reset: () => void;
}

export function useFileUpload(
  options: UseFileUploadOptions = {}
): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage =
            result.error || "ファイルのアップロードに失敗しました";
          throw new Error(errorMessage);
        }

        setProgress(100);
        options.onSuccess?.(result.data.text, result.data.filename);

        return result.data.text;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("ファイルのアップロードに失敗しました");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset,
  };
}
