"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Copy, Check, Loader2, Sparkles, MessageSquare, Trash2, RotateCcw } from "lucide-react";
import { WordExportButton } from "./WordExportButton";
import { MessageBubble } from "./MessageBubble";
import { FileAttachButton, AttachedFile } from "./FileAttachment";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { AgenticResponse } from "@/components/chat/AgenticResponse";
import { useLLMStream } from "@/components/ui/StreamingMessage";
import type { ToolOptions } from "@/lib/chat/chat-config";
import { PromptSuggestions, PromptSuggestion } from "@/components/chat/PromptSuggestions";
import { ThinkingProcess } from "@/components/agent-thinking/ThinkingProcess";
import { useThinkingSteps } from "@/hooks/useThinkingSteps";
import { useConversationSave } from "@/hooks/useConversationSave";

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
  /** ツールオプション */
  toolOptions?: ToolOptions;
  /** プロンプトサジェスト（AIレスポンス後に表示） */
  promptSuggestions?: PromptSuggestion[];
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
  toolOptions = { enableWebSearch: false },
  promptSuggestions = [],
}: FeatureChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const provider: LLMProvider = initialProvider;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    content,
    thinking,
    isComplete,
    error,
    usage,
    toolCalls,
    toolUsage,
    reasoningSteps,
    startStream,
    cancelStream,
    resetStream,
  } = useLLMStream();

  const { thinkingSteps, thinkingEvents, activeThinkingStepId } = useThinkingSteps({
    toolCalls,
    thinking,
    reasoningSteps,
    isComplete,
    content,
  });

  const {
    currentChatId,
    setCurrentChatId,
    isLoadingHistory,
    loadConversation,
    saveConversation,
  } = useConversationSave({ featureId, initialChatId, onChatCreated });

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
        200,
      )}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    let messageContent = input.trim();

    if (attachedFiles.length > 0) {
      const fileContents = attachedFiles
        .map((file) => {
          if (file.type.startsWith("image/")) {
            return `![${file.name}](${file.content})`;
          }
          return `<file name="${file.name}" type="${file.type}" size="${file.size}">\n${file.content?.substring(0, 10000) || ""}\n</file>`;
        })
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

    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const effectiveToolOptions = provider.startsWith("grok-") ? toolOptions : undefined;

    await startStream(
      [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: userMessage.content },
      ],
      provider,
      effectiveToolOptions,
    );
  };

  const handleRegenerate = async () => {
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserIndex;
    const lastUserMessage = messages[actualIndex];
    const newMessages = messages.slice(0, actualIndex);
    setMessages(newMessages);

    const conversationHistory = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const effectiveToolOptions = provider.startsWith("grok-") ? toolOptions : undefined;

    await startStream(
      [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: lastUserMessage.content },
      ],
      provider,
      effectiveToolOptions,
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
      saveConversation([...messages, assistantMessage], currentChatId);
    }
  }, [isComplete, content, messages, resetStream]);

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

  const isStreaming = !isComplete && (content || thinking);
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

      setMessages((prev) => [...prev, userMessage]);

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const effectiveToolOptions = provider.startsWith("grok-") ? toolOptions : undefined;

      await startStream(
        [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userMessage.content },
        ],
        provider,
        effectiveToolOptions,
      );
    },
    [isStreaming, messages, provider, systemPrompt, toolOptions, startStream],
  );

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900/20 to-gray-600/10 flex items-center justify-center border border-gray-900/20">
            <Sparkles className="w-4 h-4 text-gray-900" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-gray-500 hover:text-red-500 hover:bg-red-50"
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
                className="gap-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
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
              <div className="px-4 py-2">
                {thinkingSteps.length > 0 && (
                  <ThinkingProcess
                    steps={thinkingSteps}
                    activeStepId={activeThinkingStepId}
                    overallStatus="running"
                    events={thinkingEvents}
                    className="mb-4"
                  />
                )}

                {thinkingSteps.length === 0 && (
                  <AgenticResponse
                    content={content}
                    thinking={thinking}
                    toolCalls={toolCalls}
                    reasoningSteps={reasoningSteps}
                    toolUsage={toolUsage}
                    usage={usage}
                    isComplete={false}
                    provider={provider}
                    variant="chat"
                  />
                )}

                {thinkingSteps.length > 0 && content && (
                  <div className="mt-4 pl-12">
                    <div className="prose prose-neutral max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                        {content}
                        <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isStreaming && hasMessages && lastAssistantMessage && promptSuggestions.length > 0 && (
              <div className="px-4 py-4 max-w-3xl mx-auto">
                <PromptSuggestions
                  suggestions={promptSuggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {!isStreaming && hasMessages && messages.some((m) => m.role === "assistant") && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={!!isStreaming}
                  className="gap-2 border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <RotateCcw className="w-4 h-4" />
                  再生成
                </Button>
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

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-4 bg-white">
        {inputLabel && (
          <label className="block text-sm font-medium text-gray-600 mb-2">{inputLabel}</label>
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
                  onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
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
              className="min-h-[80px] max-h-[200px] resize-none bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-900/50 focus:ring-gray-900/20 pr-24"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {enableFileAttachment && (
                <FileAttachButton
                  onFilesSelect={(files) => setAttachedFiles((prev) => [...prev, ...files])}
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
            onClick={handleSend}
            disabled={!input.trim() || !!isStreaming}
            className={cn(
              "h-10 w-10 p-0 transition-all duration-200",
              !input.trim() || isStreaming
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
    </div>
  );
}

export default FeatureChat;
