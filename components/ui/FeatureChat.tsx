"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Copy, Check, Loader2 } from "lucide-react";
import { useLLMStream, StreamingMessage } from "./StreamingMessage";
import { MessageBubble } from "./MessageBubble";
import type { LLMProvider } from "@/lib/llm/types";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
}

export interface FeatureChatProps {
  featureId: string;
  title: string;
  systemPrompt: string;
  placeholder: string;
  inputLabel?: string;
  outputFormat?: "markdown" | "plaintext";
  className?: string;
}

export function FeatureChat({
  featureId,
  title,
  systemPrompt,
  placeholder,
  inputLabel,
  outputFormat = "markdown",
  className,
}: FeatureChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    content,
    thinking,
    isComplete,
    error,
    startStream,
    cancelStream,
    resetStream,
  } = useLLMStream();

  // 会話履歴を取得
  const loadConversation = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/feature?featureId=${featureId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          setMessages(
            data.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [featureId]);

  // 初回マウント時に履歴を読み込む
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, content]);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // ストリーミング開始
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await startStream(
      [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage.content },
      ],
      "gemini-2.5-flash-lite"
    );
  };

  // ストリーミング完了時にメッセージを保存
  useEffect(() => {
    if (isComplete && content) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
        llmProvider: "gemini-2.5-flash-lite",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      resetStream();

      // 会話履歴を保存
      saveConversation([...messages, assistantMessage]);
    }
  }, [isComplete, content, messages, resetStream]);

  const saveConversation = async (updatedMessages: Message[]) => {
    try {
      await fetch("/api/chat/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId,
          messages: updatedMessages,
        }),
      });
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  const handleCopy = async () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const isStreaming = !isComplete && (content || thinking);
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {outputFormat === "plaintext" && lastAssistantMessage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Wordにコピー
              </>
            )}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-end">
          {isLoadingHistory && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                履歴を読み込み中...
              </span>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              llmProvider={message.llmProvider}
            />
          ))}

          {isStreaming && (
            <StreamingMessage
              provider="gemini-2.5-flash-lite"
              content={content}
              thinking={thinking}
              isComplete={false}
            />
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              エラーが発生しました: {error}
            </div>
          )}

          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        {inputLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {inputLabel}
          </label>
        )}
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            className="flex-1 min-h-[80px] max-h-[200px] resize-none"
            disabled={!!isStreaming}
          />
          <div className="flex flex-col justify-end">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !!isStreaming}
              className="h-10 w-10 p-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Ctrl+Enter で送信
        </p>
      </div>
    </div>
  );
}

export default FeatureChat;
