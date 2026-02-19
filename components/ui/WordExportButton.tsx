/**
 * Word出力ボタンコンポーネント
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWordExport } from "@/hooks/useWordExport";
import { FileText, Loader2, Check } from "lucide-react";

interface WordExportButtonProps {
  content: string;
  filename?: string;
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function WordExportButton({
  content,
  filename,
  title,
  variant = "outline",
  size = "sm",
  disabled = false,
}: WordExportButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { exportToWord, isExporting } = useWordExport({
    onSuccess: () => {
      setShowSuccess(true);
      setError(null);
      setTimeout(() => setShowSuccess(false), 2000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleClick = async () => {
    if (!content.trim()) {
      setError("出力するコンテンツがありません");
      return;
    }
    setError(null);
    await exportToWord(content, filename, title);
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isExporting || !content.trim()}
        title="Wordファイル(.docx)としてダウンロード"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : showSuccess ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="ml-2 hidden sm:inline">
          {isExporting ? "出力中..." : "Wordで保存"}
        </span>
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
