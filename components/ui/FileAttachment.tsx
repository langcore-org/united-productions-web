"use client";

import { File, FileCode, FileText, Image, Paperclip, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { AttachedFile } from "@/types/upload";
import { getChatAcceptRecord, getChatAcceptString } from "@/types/upload";
import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE_MB } from "@/config/constants";
import { processFile } from "@/lib/chat/file-content";
import { cn } from "@/lib/utils";

export type { AttachedFile };

interface FileAttachmentProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = getChatAcceptRecord();

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.includes("json") || type.includes("javascript") || type.includes("typescript"))
    return FileCode;
  if (type.startsWith("text/")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileAttachment({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = MAX_FILE_SIZE_MB,
  disabled = false,
  className,
}: FileAttachmentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `ファイルサイズが大きすぎます（最大${maxSizeMB}MB）`;
    }
    return null;
  };

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || disabled) return;

      setError(null);

      if (files.length + fileList.length > maxFiles) {
        setError(`最大${maxFiles}ファイルまで添付できます`);
        return;
      }

      const newFiles: AttachedFile[] = [];

      for (const file of Array.from(fileList)) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        try {
          const attachedFile = await processFile(file);
          newFiles.push(attachedFile);
        } catch {
          setError(`${file.name} の読み込みに失敗しました`);
        }
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: 依存関係は安定
    [files, onFilesChange, maxFiles, disabled, validateFile],
  );

  const _handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
      setError(null);
    },
    [files, onFilesChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Drag Overlay */}
      {isDragging && (
        // biome-ignore lint/a11y/noStaticElementInteractions: ドラッグオーバーレイはdivで実装
        <div
          className="fixed inset-0 z-50 bg-gray-700/10 backdrop-blur-sm flex items-center justify-center"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center shadow-lg">
            <Paperclip className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">ファイルをドロップ</p>
            <p className="text-sm text-gray-500 mt-1">テキスト、画像、コードファイルに対応</p>
          </div>
        </div>
      )}

      {/* File Chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 group"
              >
                <Icon className="w-4 h-4 text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-700 max-w-[150px] truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Attach Button */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={Object.entries(ACCEPTED_TYPES)
          .map(([_type, exts]) => exts.join(","))
          .join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

interface FileAttachButtonProps {
  onFilesSelect: (files: AttachedFile[]) => void;
  disabled?: boolean;
  existingCount: number;
  maxFiles: number;
  maxSizeMB: number;
  onError?: (message: string | null) => void;
}

export function FileAttachButton({
  onFilesSelect,
  disabled,
  existingCount,
  maxFiles,
  maxSizeMB,
  onError,
}: FileAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);

    if (existingCount + selectedFiles.length > maxFiles) {
      onError?.(`最大${maxFiles}ファイルまで添付できます`);
      e.target.value = "";
      return;
    }

    const attachedFiles: AttachedFile[] = [];
    let lastError: string | null = null;

    for (const file of selectedFiles) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        lastError = `ファイルサイズが大きすぎます（最大${maxSizeMB}MB）`;
        continue;
      }

      try {
        attachedFiles.push(await processFile(file));
      } catch {
        lastError = `${file.name} の読み込みに失敗しました`;
      }
    }

    onError?.(lastError);
    if (attachedFiles.length > 0) {
      onFilesSelect(attachedFiles);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={getChatAcceptString()}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
    </>
  );
}

export default FileAttachment;
