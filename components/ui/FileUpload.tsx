"use client";

import { cn } from "@/lib/utils";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  ".txt",
  ".md",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
];

const TEXT_TYPES = [".txt", ".md", ".csv"];
const IMAGE_TYPES = [".png", ".jpg", ".jpeg"];

const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function FileUpload({
  onFilesSelected,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize,
  multiple = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const validateFile = (file: File): string | null => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!acceptedTypes.includes(extension)) {
      return `対応していないファイル形式です: ${extension}`;
    }

    const isImage = IMAGE_TYPES.includes(extension);
    const maxSize = maxFileSize ?? (isImage ? MAX_IMAGE_SIZE : MAX_TEXT_SIZE);

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return `ファイルサイズが大きすぎます（最大 ${maxSizeMB}MB）`;
    }

    return null;
  };

  const createPreview = (file: File): string | undefined => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (IMAGE_TYPES.includes(extension)) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const processFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const fileArray = Array.from(newFiles);
      const processedFiles: FileWithPreview[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        const preview = createPreview(file);

        processedFiles.push({
          file,
          id: generateId(),
          preview,
          progress: error ? 0 : 100,
          status: error ? "error" : "completed",
          error: error || undefined,
        });
      });

      setFiles((prev) => {
        const updated = multiple ? [...prev, ...processedFiles] : processedFiles;
        const validFiles = updated
          .filter((f) => f.status === "completed")
          .map((f) => f.file);
        onFilesSelected(validFiles);
        return updated;
      });
    },
    [multiple, onFilesSelected, acceptedTypes, maxFileSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [processFiles]
  );

  const handleRemoveFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const fileToRemove = prev.find((f) => f.id === id);
        if (fileToRemove?.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
        const updated = prev.filter((f) => f.id !== id);
        const validFiles = updated
          .filter((f) => f.status === "completed")
          .map((f) => f.file);
        onFilesSelected(validFiles);
        return updated;
      });
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const extension = "." + fileName.split(".").pop()?.toLowerCase();
    if (IMAGE_TYPES.includes(extension)) {
      return <ImageIcon className="w-5 h-5 text-[#ff6b00]" />;
    }
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8",
          "flex flex-col items-center justify-center gap-3",
          "cursor-pointer transition-all duration-200",
          "bg-[#1a1a24] border-[#2a2a35]",
          isDragging && "border-[#ff6b00] bg-[#ff6b00]/5",
          !isDragging && "hover:border-[#2a2a35] hover:bg-[#1a1a24]/80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-[#2a2a35] transition-colors",
            isDragging && "bg-[#ff6b00]/20"
          )}
        >
          <Upload
            className={cn(
              "w-6 h-6 text-gray-400 transition-colors",
              isDragging && "text-[#ff6b00]"
            )}
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-300 font-medium">
            {isDragging ? "ここにドロップ" : "クリックまたはドラッグ&ドロップ"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {acceptedTypes.join(", ")} （テキスト: 10MB、画像: 5MB）
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                "bg-[#1a1a24] border border-[#2a2a35]",
                fileItem.status === "error" && "border-red-500/50 bg-red-500/5"
              )}
            >
              {/* Preview or Icon */}
              <div className="flex-shrink-0">
                {fileItem.preview ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#0d0d12]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#2a2a35] flex items-center justify-center">
                    {getFileIcon(fileItem.file.name)}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 font-medium truncate">
                  {fileItem.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(fileItem.file.size)}
                </p>

                {/* Progress Bar */}
                {fileItem.status === "uploading" && (
                  <div className="mt-2 h-1.5 bg-[#2a2a35] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff6b00] rounded-full transition-all duration-300"
                      style={{ width: `${fileItem.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {fileItem.status === "error" && fileItem.error && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fileItem.error}
                  </p>
                )}

                {/* Completed Indicator */}
                {fileItem.status === "completed" && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                    <Check className="w-3 h-3" />
                    <span>完了</span>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveFile(fileItem.id)}
                className={cn(
                  "flex-shrink-0 p-1.5 rounded-lg",
                  "text-gray-500 hover:text-gray-300",
                  "hover:bg-[#2a2a35] transition-colors"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
