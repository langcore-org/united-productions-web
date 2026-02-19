"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FolderOpen, FileText, X, ChevronRight, Loader2 } from "lucide-react";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

interface GoogleDrivePickerProps {
  onSelect: (file: DriveFile) => void;
  onCancel: () => void;
  accept?: string[];
}

// モックデータ
const mockFiles: DriveFile[] = [
  { id: "1", name: "会議録_2024-01-15.txt", mimeType: "text/plain", size: "12KB", modifiedTime: "2024-01-15" },
  { id: "2", name: "打ち合わせ_vtt.txt", mimeType: "text/plain", size: "8KB", modifiedTime: "2024-01-14" },
  { id: "3", name: "マスタースケジュール.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: "45KB", modifiedTime: "2024-01-13" },
  { id: "4", name: "ロケ地リスト.pdf", mimeType: "application/pdf", size: "2.1MB", modifiedTime: "2024-01-12" },
  { id: "5", name: "出演者情報.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: "156KB", modifiedTime: "2024-01-11" },
];

export function GoogleDrivePicker({ onSelect, onCancel, accept }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const handleSelect = useCallback(() => {
    if (selectedFile) {
      onSelect(selectedFile);
    }
  }, [selectedFile, onSelect]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <span className="text-green-600 font-bold text-xs">XLS</span>;
    }
    if (mimeType.includes("pdf")) {
      return <span className="text-red-600 font-bold text-xs">PDF</span>;
    }
    if (mimeType.includes("word")) {
      return <span className="text-blue-600 font-bold text-xs">DOC</span>;
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
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {mockFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                    selectedFile?.id === file.id && "bg-black/5"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.size} • {file.modifiedTime}
                    </p>
                  </div>
                  {selectedFile?.id === file.id && (
                    <ChevronRight className="w-4 h-4 text-black" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedFile}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedFile
                ? "bg-black text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            選択
          </button>
        </div>
      </div>
    </div>
  );
}
