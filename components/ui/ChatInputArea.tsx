"use client";

import { Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TEXTAREA_MAX_HEIGHT_PX } from "@/config/constants";
import { cn } from "@/lib/utils";
import { type AttachedFile, FileAttachButton } from "./FileAttachment";

export interface ChatInputAreaProps {
  input: string;
  onInputChange: (value: string) => void;
  attachedFiles: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  isStreaming: boolean;
  inputLabel?: string;
  placeholder?: string;
  enableFileAttachment?: boolean;
  onSend: () => void;
}

export function ChatInputArea({
  input,
  onInputChange,
  attachedFiles,
  onFilesChange,
  isStreaming,
  inputLabel,
  placeholder = "メッセージを入力...",
  enableFileAttachment = true,
  onSend,
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = Boolean(input.trim()) || attachedFiles.length > 0;

  // テキストエリアの自動リサイズ
  // biome-ignore lint/correctness/useExhaustiveDependencies: input change triggers resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        TEXTAREA_MAX_HEIGHT_PX,
      )}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-gray-200 px-6 py-4 bg-white">
      {inputLabel && (
        <label htmlFor="chat-input" className="block text-sm font-medium text-gray-600 mb-2">
          {inputLabel}
        </label>
      )}

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200"
            >
              <span className="text-xs text-gray-700 max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onFilesChange(attachedFiles.filter((f) => f.id !== file.id))}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <Textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={placeholder}
            disabled={!!isStreaming}
            className="min-h-[80px] max-h-[200px] resize-none bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-900/50 focus:ring-gray-900/20 pr-24"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {enableFileAttachment && (
              <FileAttachButton
                onFilesSelect={(files) => onFilesChange([...attachedFiles, ...files])}
                disabled={!!isStreaming}
              />
            )}
            {input.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {input.length}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={onSend}
          disabled={!canSend || !!isStreaming}
          className={cn(
            "h-10 w-10 p-0 transition-all duration-200",
            !canSend || isStreaming
              ? "bg-gray-200 text-gray-400"
              : "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/25",
          )}
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-400">AIは正確でない情報を含むことがあります</span>
        <span className="text-gray-400">Ctrl + Enter で送信</span>
      </div>
    </div>
  );
}
