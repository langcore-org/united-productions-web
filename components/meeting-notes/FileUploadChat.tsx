"use client";

import { FileAudio, FileText, Loader2, MessageSquare, Send, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FileUploadChatProps {
  messages: Message[];
  inputText: string;
  uploadedFile: File | null;
  isGenerating: boolean;
  onFileUpload: (file: File) => void;
  onTextSubmit: (text: string) => void;
  onChatMessage: (message: string) => void;
}

export function FileUploadChat({
  messages,
  inputText,
  uploadedFile,
  isGenerating,
  onFileUpload,
  onTextSubmit,
  onChatMessage,
}: FileUploadChatProps) {
  const [text, setText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [_isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // VTTまたはTXTファイルのみ許可
      const validTypes = ["text/vtt", "text/plain", "application/x-subrip"];
      const validExtensions = [".vtt", ".txt", ".srt"];

      const hasValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );

      if (!hasValidExtension && !validTypes.includes(file.type)) {
        alert("VTT、TXT、またはSRTファイルを選択してください");
        return;
      }

      setIsUploading(true);
      await onFileUpload(file);
      setIsUploading(false);
    },
    [onFileUpload],
  );

  const handleTextSubmit = useCallback(() => {
    if (!text.trim() || isGenerating) return;
    onTextSubmit(text);
    setText("");
  }, [text, isGenerating, onTextSubmit]);

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim() || isGenerating) return;
    onChatMessage(chatInput);
    setChatInput("");
  }, [chatInput, isGenerating, onChatMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (messages.length === 0) {
          handleTextSubmit();
        } else {
          handleChatSubmit();
        }
      }
    },
    [handleTextSubmit, handleChatSubmit, messages.length],
  );

  const isInitialState = messages.length === 0 && !uploadedFile && !inputText;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <MessageSquare className="w-5 h-5 text-gray-400" />
        <h2 className="text-sm font-medium text-white">チャット</h2>
        {isGenerating && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            生成中...
          </span>
        )}
      </div>

      {/* Messages or Initial Upload UI */}
      <div className="flex-1 overflow-y-auto p-4">
        {isInitialState ? (
          // 初期状態: アップロードUI
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
                <FileAudio className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                文字起こしファイルをアップロード
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                VTT、TXT、SRTファイルをドラッグ＆ドロップ、または貼り付け
              </p>
            </div>

            {/* File Upload Button */}
            <button
              type="button"
              className={cn(
                "w-full border-2 border-dashed border-white/10 rounded-xl p-8",
                "hover:border-gray-500 hover:bg-white/[0.02]",
                "transition-colors text-center",
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">クリックしてファイルを選択</p>
              <p className="text-xs text-gray-600 mt-1">.vtt, .txt, .srt</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vtt,.txt,.srt,text/vtt,text/plain"
                className="hidden"
                onChange={handleFileSelect}
              />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 py-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500">または</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Text Input */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center">テキストを直接貼り付け</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ここに文字起こしテキストを貼り付け..."
                className={cn(
                  "w-full h-48 bg-white/5 border border-white/10 rounded-xl p-4",
                  "text-sm text-white placeholder-gray-600",
                  "focus:outline-none focus:border-gray-500",
                  "resize-none",
                )}
              />
              <button
                type="button"
                onClick={handleTextSubmit}
                disabled={!text.trim() || isGenerating}
                className={cn(
                  "w-full py-3 rounded-xl font-medium transition-all",
                  text.trim() && !isGenerating
                    ? "bg-gray-600 text-white hover:bg-gray-500"
                    : "bg-white/10 text-gray-500 cursor-not-allowed",
                )}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </span>
                ) : (
                  "議事録を生成"
                )}
              </button>
            </div>
          </div>
        ) : (
          // チャットUI
          <div className="space-y-4">
            {/* Uploaded File Info */}
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <FileText className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === "user" ? "bg-gray-600" : "bg-white/10",
                  )}
                >
                  {message.role === "user" ? (
                    <span className="text-xs text-white">You</span>
                  ) : (
                    <span className="text-xs text-gray-400">AI</span>
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-gray-600 text-white rounded-tr-sm"
                      : "bg-white/5 text-gray-200 rounded-tl-sm border border-white/10",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input (shown when there are messages) */}
      {!isInitialState && (
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="議事録を修正・磨き上げ..."
              className={cn(
                "flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3",
                "text-sm text-white placeholder-gray-600",
                "focus:outline-none focus:border-gray-500",
                "resize-none min-h-[44px] max-h-[120px]",
              )}
              rows={1}
            />
            <button
              type="button"
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || isGenerating}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                chatInput.trim() && !isGenerating
                  ? "bg-gray-600 text-white hover:bg-gray-500"
                  : "bg-white/10 text-gray-500 cursor-not-allowed",
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600 text-center">Enterで送信 · Shift+Enterで改行</p>
        </div>
      )}
    </div>
  );
}
