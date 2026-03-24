"use client";

/**
 * FeatureChat - コンテナコンポーネント
 *
 * 責務: フック群とUIコンポーネントを接続するオーケストレーション層。
 * メッセージ状態管理 → useChatMessages
 * LLMストリーミング → useLLMStream
 * 会話保存 → useConversationSave
 * チャット初期化 → useChatInitialization
 * メッセージ表示 → ChatMessages
 * 入力 → ChatInputArea
 *
 * @updated 2026-03-24: B-1リファクタリングで580行 → 約150行に削減
 */

import { Paperclip, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PromptSuggestion } from "@/components/chat/PromptSuggestions";
import { useChatInitialization } from "@/hooks/useChatInitialization";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useConversationSave } from "@/hooks/useConversationSave";
import { useLLMStream } from "@/hooks/useLLMStream";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { ChatInputArea } from "./ChatInputArea";
import { ChatMessages } from "./ChatMessages";
import type { Message } from "./chat-types";

export type { Message };

export interface FeatureChatProps {
  featureId: string;
  title: string;
  systemPrompt: string;
  placeholder?: string;
  inputLabel?: string;
  outputFormat?: "markdown" | "plaintext";
  className?: string;
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
  provider?: LLMProvider;
  emptyDescription?: string;
  enableFileAttachment?: boolean;
  promptSuggestions?: PromptSuggestion[];
  suggestions?: string[];
  selectedProgramId: string | null;
  initialMessage?: string;
}

export function FeatureChat({
  featureId,
  title,
  systemPrompt: _systemPrompt,
  placeholder = "メッセージを入力...",
  inputLabel,
  outputFormat = "markdown",
  className,
  chatId: initialChatId,
  onChatCreated,
  provider: initialProvider = DEFAULT_PROVIDER,
  emptyDescription,
  enableFileAttachment = true,
  promptSuggestions = [],
  suggestions = [],
  selectedProgramId,
  initialMessage,
}: FeatureChatProps) {
  const provider: LLMProvider = initialProvider;

  const llmStream = useLLMStream();
  const { content, isComplete, isPending, phase, error, usage, toolCalls, citations, summarizationEvents, followUp, connectionStatus, startStream, resetStream } = llmStream;

  const chat = useChatMessages({
    provider,
    featureId,
    selectedProgramId,
    enableFileAttachment,
    isPending,
    startStream,
  });

  const { currentChatId, isLoadingHistory, loadConversation, saveConversation } =
    useConversationSave({ featureId, initialChatId, selectedProgramId, onChatCreated });

  useChatInitialization({
    featureId,
    provider,
    initialChatId,
    initialMessage,
    selectedProgramId,
    messages: chat.messages,
    setMessages: chat.setMessages,
    loadConversation,
  });

  const hasSentInitialMessageRef = useRef(false);

  // 初期メッセージの自動送信
  useEffect(() => {
    if (initialChatId || hasSentInitialMessageRef.current) return;
    if (!initialMessage?.trim()) return;
    if (chat.messages.length !== 1) return;
    if (chat.messages[0]?.role !== "user") return;
    if (chat.messages[0]?.content !== initialMessage.trim()) return;

    hasSentInitialMessageRef.current = true;
    const streamMessages = chat.buildStreamMessages(chat.messages[0].content, []);
    startStream(streamMessages, provider, featureId, selectedProgramId ?? undefined);
  }, [
    chat.messages,
    initialMessage,
    initialChatId,
    provider,
    featureId,
    selectedProgramId,
    chat.buildStreamMessages,
    startStream,
  ]);

  // ストリーミング完了時にメッセージを保存
  useEffect(() => {
    if (isComplete && content) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
        llmProvider: provider,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        citations: citations.length > 0 ? citations : undefined,
        usage: usage
          ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cost: usage.cost }
          : undefined,
      };
      chat.setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        saveConversation(newMessages, currentChatId);
        return newMessages;
      });
      resetStream();
    }
  }, [
    isComplete,
    content,
    currentChatId,
    provider,
    toolCalls,
    citations,
    usage,
    resetStream,
    saveConversation,
    chat.setMessages,
  ]);

  const lastAssistantMessage = [...chat.messages].reverse().find((m) => m.role === "assistant");
  const hasMessages = chat.messages.length > 0;

  return (
    <section
      aria-label="チャットエリア"
      className={cn("flex flex-col h-full bg-white", className)}
      onDragEnter={chat.handleDragEnter}
      onDragLeave={chat.handleDragLeave}
      onDragOver={chat.handleDragOver}
      onDrop={chat.handleDrop}
    >
      {chat.isDragging && (
        <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center shadow-lg">
            <Paperclip className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">ファイルをドロップ</p>
            <p className="text-sm text-gray-500 mt-1">テキスト、画像、コードファイルに対応</p>
          </div>
        </div>
      )}

      {chat.dragError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2 shadow-lg">
          <X className="w-4 h-4" />
          {chat.dragError}
          <button
            type="button"
            onClick={() => chat.setDragError(null)}
            className="ml-2 p-1 rounded hover:bg-red-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      <ChatHeader
        title={title}
        featureId={featureId}
        outputFormat={outputFormat}
        hasMessages={hasMessages}
        lastAssistantMessage={lastAssistantMessage}
        isCopied={chat.isCopied}
        selectedProgramId={selectedProgramId}
        isStreaming={isPending}
        onCopy={chat.handleCopy}
      />

      <ChatMessages
        messages={chat.messages}
        isLoadingHistory={isLoadingHistory}
        isPending={isPending}
        isComplete={isComplete}
        title={title}
        emptyDescription={emptyDescription}
        suggestions={suggestions}
        promptSuggestions={promptSuggestions}
        onSuggestionClick={chat.handleSuggestionClick}
        content={content}
        phase={phase}
        error={error}
        usage={usage}
        toolCalls={toolCalls}
        citations={citations}
        summarizationEvents={summarizationEvents}
        followUp={followUp}
        connectionStatus={connectionStatus}
        provider={provider}
      />

      <ChatInputArea
        input={chat.input}
        onInputChange={chat.setInput}
        attachedFiles={chat.attachedFiles}
        onFilesChange={chat.setAttachedFiles}
        isStreaming={isPending}
        inputLabel={inputLabel}
        placeholder={placeholder}
        enableFileAttachment={enableFileAttachment}
        onSend={chat.handleSend}
      />
    </section>
  );
}

export default FeatureChat;
