"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Copy, Check, Loader2, Sparkles, MessageSquare, Trash2 } from "lucide-react";
import { WordExportButton } from "./WordExportButton";
import { useLLMStream, StreamingMessage } from "./StreamingMessage";
import { MessageBubble } from "./MessageBubble";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
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
  placeholder?: string;
  inputLabel?: string;
  outputFormat?: "markdown" | "plaintext";
  className?: string;
  /** 使用するLLMプロバイダー（未指定時はデフォルト） */
  provider?: LLMProvider;
  /** 空の状態の説明 */
  emptyDescription?: string;
}

export function FeatureChat({
  featureId,
  title,
  systemPrompt,
  placeholder = "メッセージを入力...",
  inputLabel,
  outputFormat = "markdown",
  className,
  provider = DEFAULT_PROVIDER,
  emptyDescription,
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
      provider
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
        llmProvider: provider,
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

  const handleClear = async () => {
    setMessages([]);
    try {
      await fetch("/api/chat/feature", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId }),
      });
    } catch (err) {
      console.error("Failed to clear conversation:", err);
    }
  };

  const isStreaming = !isComplete && (content || thinking);
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const hasMessages = messages.length > 0;

  return (
    <div className={cn("flex flex-col h-full bg-[#0d0d12]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35] bg-[#14141a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b00]/20 to-[#ff8533]/10 flex items-center justify-center border border-[#ff6b00]/20">
            <Sparkles className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              クリア
            </Button>
          )}
          
          {outputFormat === "plaintext" && lastAssistantMessage && (
            <>
              <WordExportButton
                content={lastAssistantMessage.content}
                filename={`${featureId}_${new Date().toISOString().split("T")[0]}`}
                title={title}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2 border-[#2a2a35] bg-[#1e1e24] text-gray-300 hover:bg-[#2a2a35] hover:text-white"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">履歴を読み込み中...</span>
            </div>
          </div>
        ) : !hasMessages && !isStreaming ? (
          // 空の状態
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b00]/20 to-[#ff8533]/10 flex items-center justify-center border border-[#ff6b00]/20 mb-4">
              <MessageSquare className="w-8 h-8 text-[#ff6b00]" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">
              {title}
            </h2>
            <p className="text-sm text-gray-400 max-w-md">
              {emptyDescription || "メッセージを送信して、AIと対話を始めましょう。"}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 rounded bg-[#1e1e24] border border-[#2a2a35]">
                Ctrl + Enter
              </span>
              <span>で送信</span>
            </div>
          </div>
        ) : (
          <div className="py-4">
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
                provider={provider}
                content={content}
                thinking={thinking}
                isComplete={false}
              />
            )}

            {error && (
              <div className="mx-4 my-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <p className="font-medium mb-1">エラーが発生しました</p>
                <p className="text-red-300/80">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-[#2a2a35] px-6 py-4 bg-[#14141a]">
        {inputLabel && (
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {inputLabel}
          </label>
        )}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
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
              disabled={!!isStreaming}
              className="min-h-[80px] max-h-[200px] resize-none bg-[#1e1e24] border-[#2a2a35] text-white placeholder:text-gray-500 focus:border-[#ff6b00]/50 focus:ring-[#ff6b00]/20 pr-12"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500">
              {input.length > 0 && (
                <span className="bg-[#2a2a35] px-2 py-0.5 rounded">
                  {input.length}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !!isStreaming}
            className={cn(
              "h-10 w-10 p-0 transition-all duration-200",
              !input.trim() || isStreaming
                ? "bg-[#2a2a35] text-gray-500"
                : "bg-[#ff6b00] hover:bg-[#ff8533] text-white shadow-lg shadow-[#ff6b00]/25"
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
          <span className="text-gray-500">
            AIは正確でない情報を含むことがあります
          </span>
          <span className="text-gray-600">
            Ctrl + Enter で送信
          </span>
        </div>
      </div>
    </div>
  );
}

export default FeatureChat;
