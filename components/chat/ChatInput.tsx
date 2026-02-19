"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
  placeholder?: string;
  onSubmit: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  isStreaming,
  placeholder = "メッセージを入力...",
  onSubmit,
  onCancel,
  onKeyDown,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリア自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none max-h-[200px] py-3 px-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            disabled={isLoading}
          />

          <div className="flex items-center gap-2 pb-2 pr-2">
            {isStreaming ? (
              <button
                onClick={onCancel}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  input.trim() && !isLoading
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-2">
          Enterで送信 · Shift+Enterで改行
        </p>
      </div>
    </div>
  );
}
