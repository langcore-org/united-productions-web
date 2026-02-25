"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreamingSteps } from "@/components/chat";
import { FollowUpSuggestions } from "@/components/chat/FollowUpSuggestions";
import { type PromptSuggestion, PromptSuggestions } from "@/components/chat/PromptSuggestions";

import { useConversationSave } from "@/hooks/useConversationSave";
import { useLLMStream } from "@/hooks/useLLMStream";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { cn } from "@/lib/utils";
import { ChatHeader } from "./ChatHeader";
import { ChatInputArea } from "./ChatInputArea";
import type { AttachedFile } from "./FileAttachment";
import { MessageBubble } from "./MessageBubble";

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
  /** チャットセッションID（指定なしの場合は新規チャット） */
  chatId?: string;
  /** チャットが新規作成されたときに呼ばれるコールバック */
  onChatCreated?: (chatId: string) => void;
  /** 使用するLLMプロバイダー（未指定時はデフォルト） */
  provider?: LLMProvider;
  /** 空の状態の説明 */
  emptyDescription?: string;
  /** ファイル添付を有効化 */
  enableFileAttachment?: boolean;
  /** プロンプトサジェスト（AIレスポンス後に表示） */
  promptSuggestions?: PromptSuggestion[];
  /** 新規チャット時のサジェスト例 */
  suggestions?: string[];
  /** 番組選択機能を有効化 */
  enableProgramSelector?: boolean;
}

export function FeatureChat({
  featureId,
  title,
  systemPrompt,
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
  enableProgramSelector = false,
}: FeatureChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");

  const provider: LLMProvider = initialProvider;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { content, isComplete, error, usage, toolCalls, summarizationEvents, followUp, startStream, resetStream } =
    useLLMStream();

  const { currentChatId, setCurrentChatId, isLoadingHistory, loadConversation, saveConversation } =
    useConversationSave({ featureId, initialChatId, onChatCreated });

  // 初回マウント時: chatIdがあれば履歴を読み込む、なければ新規（空）
  useEffect(() => {
    if (initialChatId) {
      setCurrentChatId(initialChatId);
      loadConversation(initialChatId).then(setMessages);
    } else {
      setMessages([]);
      setCurrentChatId(undefined);
    }
  }, [initialChatId, loadConversation, setCurrentChatId]);

  // スクロール制御: ユーザーが手動スクロールした場合は自動スクロールを一時停止
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsUserScrolling(true);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      // ユーザーが最下部に近い場合は自動スクロールを再有効化
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        userScrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 500);
      } else {
        userScrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 3000);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // メッセージ追加時に自動スクロール（ユーザーが手動スクロール中でない場合のみ）
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.lengthは意図的な依存（メッセージ追加時にスクロール）
  useEffect(() => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isUserScrolling]);

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
      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        saveConversation(newMessages, currentChatId);
        return newMessages;
      });
      resetStream();
    }
  }, [isComplete, content, currentChatId, provider, resetStream, saveConversation]);

  const buildStreamMessages = useCallback((userContent: string, history: Message[]) => {
    const conversationHistory = history.map((m) => ({ role: m.role, content: m.content }));
    return [...conversationHistory, { role: "user" as const, content: userContent }];
  }, []);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    let messageContent = input.trim();
    if (attachedFiles.length > 0) {
      const fileContents = attachedFiles
        .map((file) =>
          file.type.startsWith("image/")
            ? `![${file.name}](${file.content})`
            : `<file name="${file.name}" type="${file.type}" size="${file.size}">\n${file.content?.substring(0, 10000) || ""}\n</file>`,
        )
        .join("\n\n");
      messageContent = messageContent ? `${messageContent}\n\n${fileContents}` : fileContents;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);

    const streamMessages = buildStreamMessages(userMessage.content, messages);
    await startStream(streamMessages, provider, featureId, selectedProgramId);
  };

  const handleCopy = async () => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleClear = async () => {
    setMessages([]);
    const chatIdToDelete = currentChatId;
    setCurrentChatId(undefined);
    if (chatIdToDelete) {
      try {
        await fetch(`/api/chat/feature?chatId=${chatIdToDelete}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to clear conversation:", err);
      }
    }
  };

  const isStreaming = !isComplete && !!content;
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const hasMessages = messages.length > 0;

  const handleSuggestionClick = useCallback(
    async (suggestionText: string) => {
      if (isStreaming || !suggestionText.trim()) return;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: suggestionText.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        const streamMessages = buildStreamMessages(userMessage.content, newMessages.slice(0, -1));
        startStream(streamMessages, provider, featureId, selectedProgramId);
        return newMessages;
      });
    },
    [isStreaming, provider, startStream, buildStreamMessages, selectedProgramId],
  );

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      <ChatHeader
        title={title}
        featureId={featureId}
        outputFormat={outputFormat}
        hasMessages={hasMessages}
        lastAssistantMessage={lastAssistantMessage}
        isCopied={isCopied}
        onClear={handleClear}
        onCopy={handleCopy}
        enableProgramSelector={enableProgramSelector}
        selectedProgramId={selectedProgramId}
        onProgramChange={setSelectedProgramId}
        isProgramSelectorDisabled={!isComplete}
      />

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">履歴を読み込み中...</span>
            </div>
          </div>
        ) : !hasMessages && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900/20 to-gray-600/10 flex items-center justify-center border border-gray-900/20 mb-4">
              <MessageSquare className="w-8 h-8 text-gray-900" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-500 max-w-md">
              {emptyDescription || "メッセージを送信して、AIと対話を始めましょう。"}
            </p>

            {/* サジェストボタン */}
            {suggestions.length > 0 && (
              <div className="mt-8 w-full max-w-lg">
                <p className="text-xs text-gray-400 mb-3">例:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-full transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">
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
              <StreamingSteps
                content={content}
                toolCalls={toolCalls}
                summarizationEvents={summarizationEvents}
                usage={usage}
                provider={provider}
                isComplete={isComplete}
              />
            )}

            {/* フォローアップサジェスト（動的生成） */}
            {!isStreaming && hasMessages && lastAssistantMessage && (
              <div className="px-4 py-4 max-w-3xl mx-auto">
                <FollowUpSuggestions
                  suggestions={followUp.questions.map((q, i) => ({ id: String(i), text: q }))}
                  onSuggestionClick={handleSuggestionClick}
                  isLoading={followUp.isLoading}
                />
              </div>
            )}

            {/* 固定プロンプトサジェスト（設定されている場合） */}
            {!isStreaming &&
              hasMessages &&
              lastAssistantMessage &&
              promptSuggestions.length > 0 &&
              followUp.questions.length === 0 &&
              !followUp.isLoading && (
                <div className="px-4 py-4 max-w-3xl mx-auto">
                  <PromptSuggestions
                    suggestions={promptSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                  />
                </div>
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

      <ChatInputArea
        input={input}
        onInputChange={setInput}
        attachedFiles={attachedFiles}
        onFilesChange={setAttachedFiles}
        isStreaming={!!isStreaming}
        inputLabel={inputLabel}
        placeholder={placeholder}
        enableFileAttachment={enableFileAttachment}
        onSend={handleSend}
      />
    </div>
  );
}

export default FeatureChat;
