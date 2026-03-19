# ドラッグ＆ドロップ機能 リファクタリング実装プラン

**作成日**: 2026-03-18  
**ステータス**: 計画段階  
**優先度**: 高

---

## 実装フェーズ詳細

### Phase 1: カスタムフックの作成

#### 1.1 hooks/useFileProcessor.ts

```typescript
"use client";

import { useCallback, useState } from "react";
import { MAX_FILE_SIZE_MB } from "@/config/constants";
import { isTextFile } from "@/lib/chat/file-content";

export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string | null;
}

interface UseFileProcessorOptions {
  maxSizeMB?: number;
  maxFiles?: number;
}

interface UseFileProcessorReturn {
  processFiles: (files: FileList) => Promise<ProcessedFile[]>;
  validateFile: (file: File) => string | null;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

function generateFileId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function useFileProcessor(
  options: UseFileProcessorOptions = {}
): UseFileProcessorReturn {
  const { maxSizeMB = MAX_FILE_SIZE_MB, maxFiles = 5 } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `ファイルサイズが大きすぎます（最大${maxSizeMB}MB）`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const processSingleFile = useCallback(
    async (file: File): Promise<ProcessedFile> => {
      const type = file.type || "application/octet-stream";

      // バイナリファイルは内容を読み込まず、メタ情報のみ保持
      if (!isTextFile(type) && !type.startsWith("image/")) {
        return {
          id: generateFileId(),
          name: file.name,
          type,
          size: file.size,
          content: null,
        };
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: generateFileId(),
            name: file.name,
            type,
            size: file.size,
            content: e.target?.result as string,
          });
        };
        reader.onerror = () => reject(new Error(`${file.name} の読み込みに失敗しました`));

        if (isTextFile(type)) {
          reader.readAsText(file);
        } else if (type.startsWith("image/")) {
          reader.readAsDataURL(file);
        }
      });
    },
    []
  );

  const processFiles = useCallback(
    async (fileList: FileList): Promise<ProcessedFile[]> => {
      setIsProcessing(true);
      setError(null);

      try {
        const files = Array.from(fileList);
        
        if (files.length > maxFiles) {
          throw new Error(`最大${maxFiles}ファイルまで添付できます`);
        }

        const processedFiles: ProcessedFile[] = [];
        const errors: string[] = [];

        for (const file of files) {
          const validationError = validateFile(file);
          if (validationError) {
            errors.push(`${file.name}: ${validationError}`);
            continue;
          }

          try {
            const processed = await processSingleFile(file);
            processedFiles.push(processed);
          } catch (err) {
            errors.push(err instanceof Error ? err.message : `${file.name} の処理に失敗しました`);
          }
        }

        if (errors.length > 0) {
          setError(errors.join("\n"));
        }

        return processedFiles;
      } finally {
        setIsProcessing(false);
      }
    },
    [maxFiles, validateFile, processSingleFile]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    processFiles,
    validateFile,
    isProcessing,
    error,
    clearError,
  };
}
```

#### 1.2 hooks/useDragAndDrop.ts

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

interface UseDragAndDropOptions {
  onFilesDrop: (files: FileList) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
}

interface UseDragAndDropReturn {
  isDragging: boolean;
  handlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export function useDragAndDrop(options: UseDragAndDropOptions): UseDragAndDropReturn {
  const { onFilesDrop, disabled = false } = options;
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      
      if (!disabled && e.dataTransfer.files.length > 0) {
        onFilesDrop(e.dataTransfer.files);
      }
    },
    [disabled, onFilesDrop]
  );

  return {
    isDragging,
    handlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
```

### Phase 2: 共通コンポーネントの作成

#### 2.1 components/ui/DragDropOverlay.tsx

```tsx
"use client";

import { Paperclip } from "lucide-react";

interface DragDropOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
}

export function DragDropOverlay({
  isVisible,
  title = "ファイルをドロップ",
  description = "テキスト、画像、コードファイルに対応",
}: DragDropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center shadow-lg">
        <Paperclip className="w-12 h-12 text-gray-700 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
```

#### 2.2 components/ui/FileValidationError.tsx

```tsx
"use client";

import { Trash2, X } from "lucide-react";

interface FileValidationErrorProps {
  error: string | null;
  onClear: () => void;
  position?: "top" | "inline";
}

export function FileValidationError({
  error,
  onClear,
  position = "top",
}: FileValidationErrorProps) {
  if (!error) return null;

  if (position === "top") {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2 shadow-lg">
        <X className="w-4 h-4" />
        <span className="whitespace-pre-line">{error}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-2 p-1 rounded hover:bg-red-100"
          aria-label="エラーを閉じる"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-500">
      <X className="w-3 h-3" />
      <span>{error}</span>
    </div>
  );
}
```

### Phase 3: FeatureChat.tsx のリファクタリング

```tsx
// 変更前（現在の実装）
const [isDragging, setIsDragging] = useState(false);
const [dragError, setDragError] = useState<string | null>(null);
const dragCounter = useRef(0);

// ファイル処理（90行程度）
const processFile = useCallback(...);
const validateFile = useCallback(...);
const handleFiles = useCallback(...);

// ドラッグハンドラ（40行程度）
const handleDragEnter = useCallback(...);
const handleDragLeave = useCallback(...);
const handleDragOver = useCallback(...);
const handleDrop = useCallback(...);

// 変更後（リファクタリング後）
import { useFileProcessor } from "@/hooks/useFileProcessor";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { DragDropOverlay } from "@/components/ui/DragDropOverlay";
import { FileValidationError } from "@/components/ui/FileValidationError";

const {
  processFiles,
  isProcessing: isFileProcessing,
  error: fileError,
  clearError,
} = useFileProcessor({
  maxSizeMB: MAX_FILE_SIZE_MB,
  maxFiles: 5,
});

const handleFilesDrop = useCallback(
  async (fileList: FileList) => {
    if (isPending || !enableFileAttachment) return;
    
    const newFiles = await processFiles(fileList);
    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  },
  [isPending, enableFileAttachment, processFiles]
);

const { isDragging, handlers: dragHandlers } = useDragAndDrop({
  onFilesDrop: handleFilesDrop,
  disabled: isPending || !enableFileAttachment,
});

// JSX
<section
  aria-label="チャットエリア"
  className={cn("flex flex-col h-full bg-white", className)}
  {...dragHandlers}
>
  <DragDropOverlay isVisible={isDragging} />
  <FileValidationError
    error={fileError}
    onClear={clearError}
    position="top"
  />
  {/* ... rest of the component */}
</section>
```

### Phase 4: FileAttachment.tsx の修正

```tsx
// 修正点:
// 1. _handleDragOver → handleDragOver に修正（Typo）
// 2. 親コンポーネントからドラッグイベントを受け取るPropsを追加

interface FileAttachmentProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  // 追加: 親からドラッグイベントを受け取る
  externalDragging?: boolean;
}

// 削除: 内部のドラッグ状態管理（親に委譲）
// const [isDragging, setIsDragging] = useState(false);

// 修正: Typo
const handleDragOver = useCallback(...);  // _handleDragOver から変更
```

---

## 移行ステップ

### Step 1: フックの作成（後方互換性あり）
1. `hooks/useFileProcessor.ts` を作成
2. `hooks/useDragAndDrop.ts` を作成
3. 既存コードは変更せず、新規コードから利用開始

### Step 2: 共通コンポーネントの作成
1. `components/ui/DragDropOverlay.tsx` を作成
2. `components/ui/FileValidationError.tsx` を作成

### Step 3: FeatureChat.tsx の移行
1. 新規フックをimport
2. ドラッグ＆ドロップ関連コードを置き換え
3. 動作確認

### Step 4: FileAttachment.tsx の修正
1. Typo修正
2. 重複コード削除

### Step 5: FileUpload.tsx の移行
1. 新規フックを利用
2. 重複コード削除

### Step 6: テストとドキュメント更新
1. 既存テストが通ることを確認
2. Storybookがあれば更新
3. ドキュメント更新

---

## チェックリスト

- [ ] hooks/useFileProcessor.ts 作成
- [ ] hooks/useDragAndDrop.ts 作成
- [ ] components/ui/DragDropOverlay.tsx 作成
- [ ] components/ui/FileValidationError.tsx 作成
- [ ] FeatureChat.tsx リファクタリング
- [ ] FileAttachment.tsx Typo修正
- [ ] FileUpload.tsx リファクタリング
- [ ] 既存テストの確認/更新
- [ ] 手動動作確認
- [ ] ドキュメント更新
