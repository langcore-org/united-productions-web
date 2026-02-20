/**
 * ファイルアップロードコンポーネント
 * ドラッグ&ドロップ対応 + Google Drive連携
 */

"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { Upload, File, X, Loader2, Check, FolderOpen } from "lucide-react";
import { GoogleDrivePicker } from "./GoogleDrivePicker";

interface FileUploadProps {
  onUpload: (text: string, filename: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
  enableGoogleDrive?: boolean; // Google Drive連携を有効にするか
}

const DEFAULT_ACCEPT = {
  "text/plain": [".txt"],
  "text/vtt": [".vtt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// MIMEタイプをGoogle Drive API用に変換
function getGoogleDriveMimeTypes(accept: Record<string, string[]>): string[] {
  const mimeTypes: string[] = [];
  
  // 通常のMIMEタイプ
  Object.keys(accept).forEach(mime => {
    mimeTypes.push(mime);
  });
  
  // Google Workspaceファイルも追加
  mimeTypes.push(
    "application/vnd.google-apps.document",      // Google Docs
    "application/vnd.google-apps.spreadsheet",   // Google Sheets
    "application/vnd.google-apps.presentation"   // Google Slides
  );
  
  return mimeTypes;
}

export function FileUpload({
  onUpload,
  accept = DEFAULT_ACCEPT,
  maxSize = MAX_FILE_SIZE,
  className,
  enableGoogleDrive = true,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  const { uploadFile, isUploading, progress, error, reset } = useFileUpload({
    onSuccess: (text, filename) => {
      onUpload(text, filename);
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `ファイルサイズは${formatBytes(maxSize)}以下にしてください`;
    }

    // 拡張子チェック
    const allowedExtensions = Object.values(accept).flat();
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return "対応していないファイル形式です (.txt, .vtt, .docx)";
    }

    return null;
  };

  const handleFile = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setUploadedFile(file);
    await uploadFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [uploadFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [uploadFile]
  );

  const handleClear = () => {
    setUploadedFile(null);
    setValidationError(null);
    reset();
  };

  // Google Driveからファイルを選択
  const handleDriveSelect = (file: { id: string; name: string; mimeType: string }, content: string) => {
    setShowDrivePicker(false);
    
    // ファイル名を設定
    setUploadedFile({
      name: file.name,
      size: content.length,
    } as File);
    
    // 内容を親コンポーネントに渡す
    onUpload(content, file.name);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatAcceptTypes = () => {
    return Object.values(accept)
      .flat()
      .join(", ");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* アップロードエリア */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver && "border-primary bg-primary/5",
          isUploading && "opacity-50 cursor-not-allowed",
          validationError && "border-destructive",
          !isDragOver &&
            !validationError &&
            "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input
          type="file"
          accept={formatAcceptTypes()}
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer block"
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : isDragOver ? (
              <Upload className="h-10 w-10 text-primary" />
            ) : (
              <File className="h-10 w-10 text-muted-foreground" />
            )}

            <div className="text-sm">
              {isDragOver ? (
                <p className="text-primary font-medium">
                  ここにファイルをドロップ
                </p>
              ) : isUploading ? (
                <p className="text-muted-foreground">アップロード中...</p>
              ) : (
                <>
                  <p className="font-medium">
                    クリックまたはドラッグ&ドロップでファイルをアップロード
                  </p>
                  <p className="text-muted-foreground mt-1">
                    対応形式: {formatAcceptTypes()} (最大 {formatBytes(maxSize)})
                  </p>
                </>
              )}
            </div>
          </div>
        </label>
      </div>

      {/* Google Drive選択ボタン */}
      {enableGoogleDrive && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDrivePicker(true)}
            disabled={isUploading}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Google Driveから選択
          </Button>
        </div>
      )}

      {/* エラーメッセージ */}
      {(validationError || error) && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>{validationError || error?.message}</span>
        </div>
      )}

      {/* アップロード済みファイル表示 */}
      {uploadedFile && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* プログレス表示 */}
          {isUploading && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {progress}%
              </p>
            </div>
          )}

          {/* 完了表示 */}
          {!isUploading && progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4" />
              <span>読み込み完了</span>
            </div>
          )}
        </div>
      )}

      {/* Google Drive Picker */}
      {showDrivePicker && (
        <GoogleDrivePicker
          onSelect={handleDriveSelect}
          onCancel={() => setShowDrivePicker(false)}
          accept={getGoogleDriveMimeTypes(accept)}
        />
      )}
    </div>
  );
}
