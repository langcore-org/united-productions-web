"use client";

import { ChevronRight, FileText, FolderOpen, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface GoogleDrivePickerProps {
  onSelect: (file: DriveFile, content: string) => void;
  onCancel: () => void;
  accept?: string[]; // 例: ["text/plain", "application/vnd.google-apps.document"]
}

// ファイルサイズを整形
function formatFileSize(bytes?: string): string {
  if (!bytes) return "-";
  const size = parseInt(bytes, 10);
  if (Number.isNaN(size)) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let value = size;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// 日付を整形
function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GoogleDrivePicker({ onSelect, onCancel, accept }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ファイル一覧を取得
  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 検索クエリ構築
        let query = "trashed=false";

        // MIMEタイプでフィルタ
        if (accept && accept.length > 0) {
          const mimeQueries = accept.map((mime) => `mimeType='${mime}'`).join(" or ");
          query += ` and (${mimeQueries})`;
        }

        const response = await fetch(`/api/drive/files?q=${encodeURIComponent(query)}&pageSize=50`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "ファイル一覧の取得に失敗しました");
        }

        setFiles(data.files || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "エラーが発生しました";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [accept]);

  // ファイルを選択してダウンロード
  const handleSelect = useCallback(async () => {
    if (!selectedFile) return;

    setIsDownloading(true);
    setError(null);

    try {
      // ファイル内容を取得
      const response = await fetch(`/api/drive/download?fileId=${selectedFile.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ファイルの取得に失敗しました");
      }

      // エクスポート後のファイル名を使用
      const fileWithExportedName = {
        ...selectedFile,
        name: data.metadata.name, // エクスポート後の名前（.txt等が付く）
        mimeType: data.metadata.isGoogleWorkspaceFile
          ? "text/plain" // エクスポート後はテキストとして扱う
          : selectedFile.mimeType,
      };

      onSelect(fileWithExportedName, data.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  }, [selectedFile, onSelect]);

  // 検索フィルタ
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <span className="text-gray-600 font-bold text-xs">XLS</span>;
    }
    if (mimeType.includes("pdf")) {
      return <span className="text-gray-500 font-bold text-xs">PDF</span>;
    }
    if (mimeType.includes("word") || mimeType.includes("document")) {
      return <span className="text-gray-700 font-bold text-xs">DOC</span>;
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return <span className="text-gray-600 font-bold text-xs">PPT</span>;
    }
    if (mimeType === "text/plain") {
      return <span className="text-gray-600 font-bold text-xs">TXT</span>;
    }
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-black" />
            <h3 className="font-semibold text-gray-900">Google Driveから選択</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ファイル名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* File List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">ファイルが見つかりません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredFiles.map((file) => (
                <button
                  type="button"
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                    selectedFile?.id === file.id && "bg-black/5",
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {formatDate(file.modifiedTime)}
                    </p>
                  </div>
                  {selectedFile?.id === file.id && <ChevronRight className="w-4 h-4 text-black" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">{filteredFiles.length} 件のファイル</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSelect}
              disabled={!selectedFile || isDownloading}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                selectedFile && !isDownloading
                  ? "bg-black text-white hover:bg-gray-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              {isDownloading && <Loader2 className="w-4 h-4 animate-spin" />}
              選択
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
