"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Paperclip, X, FileText, Image, FileCode, File } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
}

interface FileAttachmentProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = {
  "text/plain": [".txt", ".md", ".csv"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/pdf": [".pdf"],
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  "code/*": [".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css"],
};

import { MAX_FILE_SIZE_MB } from "@/config/constants";

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

  const processFile = async (file: File): Promise<AttachedFile> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          content: e.target?.result as string,
        });
      };
      
      // テキストファイルはテキストとして読み込み、画像はBase64
      if (file.type.startsWith("text/") || file.type.includes("json") || file.type.includes("javascript")) {
        reader.readAsText(file);
      } else if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
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
    [files, onFilesChange, maxFiles, maxSizeMB, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
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
    [handleFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
      setError(null);
    },
    [files, onFilesChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Drag Overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 bg-gray-700/10 backdrop-blur-sm flex items-center justify-center"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center shadow-lg">
            <Paperclip className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">ファイルをドロップ</p>
            <p className="text-sm text-gray-500 mt-1">
              テキスト、画像、コードファイルに対応
            </p>
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
                  <span className="text-xs text-gray-700 max-w-[150px] truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
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
          .map(([type, exts]) => exts.join(","))
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
}

export function FileAttachButton({ onFilesSelect, disabled }: FileAttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const attachedFiles: AttachedFile[] = [];

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const attachedFile = await new Promise<AttachedFile>((resolve) => {
        reader.onload = (event) => {
          resolve({
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            content: event.target?.result as string,
          });
        };
        
        if (file.type.startsWith("text/") || file.type.includes("json")) {
          reader.readAsText(file);
        } else if (file.type.startsWith("image/")) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });

      attachedFiles.push(attachedFile);
    }

    onFilesSelect(attachedFiles);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.gif,.webp,.js,.ts,.tsx,.jsx,.py,.html,.css"
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
