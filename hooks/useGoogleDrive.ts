"use client";

import { useState, useCallback } from "react";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export function useGoogleDrive() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Driveのファイル一覧を取得
   */
  const listFiles = useCallback(async (query?: string): Promise<DriveFile[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);

      const response = await fetch(`/api/drive/files?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ファイル一覧の取得に失敗しました");
      }

      return data.files || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ファイルをアップロード
   */
  const uploadFile = useCallback(async (
    file: File,
    name?: string
  ): Promise<DriveFile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (name) formData.append("name", name);

      const response = await fetch("/api/drive/files", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "アップロードに失敗しました");
      }

      return data.file;
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ファイルをダウンロード
   */
  const downloadFile = useCallback(async (
    fileId: string
  ): Promise<{ metadata: DriveFile; content: string } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/drive/download?fileId=${fileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ダウンロードに失敗しました");
      }

      return {
        metadata: data.metadata,
        content: data.content,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    listFiles,
    uploadFile,
    downloadFile,
    isLoading,
    error,
  };
}
