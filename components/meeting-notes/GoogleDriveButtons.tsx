"use client";

import { Check, FolderOpen, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { GoogleDrivePicker } from "@/components/ui/GoogleDrivePicker";
import { type DriveFile, useGoogleDrive } from "@/hooks/useGoogleDrive";
import { cn } from "@/lib/utils";

interface DriveUploadButtonProps {
  content: string;
  filename: string;
  onSuccess?: (file: DriveFile) => void;
}

/**
 * Google Driveに保存ボタン
 */
export function DriveUploadButton({ content, filename, onSuccess }: DriveUploadButtonProps) {
  const { uploadFile, isLoading } = useGoogleDrive();
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async () => {
    // コンテンツをBlobに変換
    const blob = new Blob([content], { type: "text/markdown" });
    const file = new File([blob], filename, { type: "text/markdown" });

    const result = await uploadFile(file, filename);
    if (result) {
      setUploaded(true);
      onSuccess?.(result);
      setTimeout(() => setUploaded(false), 3000);
    }
  };

  return (
    <button
      onClick={handleUpload}
      disabled={isLoading || !content}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        uploaded
          ? "bg-gray-100 text-gray-700 border border-gray-200"
          : "bg-white border border-gray-200 text-gray-700 hover:border-black hover:text-black",
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : uploaded ? (
        <Check className="w-4 h-4" />
      ) : (
        <Upload className="w-4 h-4" />
      )}
      {uploaded ? "保存完了" : "Google Driveに保存"}
    </button>
  );
}

interface DriveFileSelectButtonProps {
  onSelect: (content: string, filename: string) => void;
  accept?: string[];
}

/**
 * Google Driveからファイル選択ボタン
 */
export function DriveFileSelectButton({ onSelect, accept }: DriveFileSelectButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { downloadFile, isLoading } = useGoogleDrive();

  const handleSelect = async (file: DriveFile) => {
    setShowPicker(false);

    const result = await downloadFile(file.id);
    if (result) {
      onSelect(result.content, result.metadata.name);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-white border border-gray-200 text-gray-700 hover:border-black hover:text-black",
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FolderOpen className="w-4 h-4" />
        )}
        Google Driveから選択
      </button>

      {showPicker && (
        <GoogleDrivePicker
          onSelect={handleSelect}
          onCancel={() => setShowPicker(false)}
          accept={accept}
        />
      )}
    </>
  );
}
