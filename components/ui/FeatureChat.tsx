"use client";

import { Loader2, MessageSquare, Paperclip, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StreamingSteps } from "@/components/chat";
import { FollowUpSuggestions } from "@/components/chat/FollowUpSuggestions";
import { CitationsList } from "@/components/chat/messages/CitationsList";
import { ToolCallGroup } from "@/components/chat/messages/ToolCallGroup";
import { type PromptSuggestion, PromptSuggestions } from "@/components/chat/PromptSuggestions";
import { MAX_FILE_SIZE_MB } from "@/config/constants";
import { useChatInitialization } from "@/hooks/useChatInitialization";
import { useConversationSave } from "@/hooks/useConversationSave";
import { useLLMStream } from "@/hooks/useLLMStream";
import { buildDisplayContent, buildLlmContent, isTextFile } from "@/lib/chat/file-content";
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
  toolCalls?: Array<{
    id: string;
    name: string;
    displayName: string;
    status: "running" | "completed";
    input?: string;
  }>;
  citations?: Array<{ url: string; title: string }>;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
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
  /** 選択された番組ID（必須） */
  selectedProgramId: string | null;
  /** 初期メッセージ（指定時は自動送信） */
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const hasSentInitialMessageRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const dragCounter = useRef(0);

  const provider: LLMProvider = initialProvider;

  const {
    content,
    isComplete,
    isPending,
    phase,
    error,
    usage,
    toolCalls,
    citations,
    summarizationEvents,
    followUp,
    connectionStatus,
    startStream,
    resetStream,
  } = useLLMStream();

  const { currentChatId, isLoadingHistory, loadConversation, saveConversation } =
    useConversationSave({ featureId, initialChatId, selectedProgramId, onChatCreated });

  // チャット初期化（履歴読み込み、ウェルカムメッセージ、初期メッセージ送信準備）
  useChatInitialization({
    featureId,
    provider,
    initialChatId,
    initialMessage,
    selectedProgramId,
    messages,
    setMessages,
    loadConversation,
  });

  const buildStreamMessages = useCallback((userContent: string, history: Message[]) => {
    const conversationHistory = history.map((m) => ({ role: m.role, content: m.content }));
    return [...conversationHistory, { role: "user" as const, content: userContent }];
  }, []);

  // 初期メッセージの自動送信（useChatInitializationでメッセージがセットされた後）
  useEffect(() => {
    // 既存会話、または既に送信済みの場合はスキップ
    if (initialChatId || hasSentInitialMessageRef.current) return;
    if (!initialMessage?.trim()) return;
    // 初期化フックでセットされたメッセージを検知して送信
    if (messages.length !== 1) return;
    if (messages[0]?.role !== "user") return;
    if (messages[0]?.content !== initialMessage.trim()) return;

    hasSentInitialMessageRef.current = true;

    const streamMessages = buildStreamMessages(messages[0].content, []);
    startStream(streamMessages, provider, featureId, selectedProgramId ?? undefined);
  }, [
    messages,
    initialMessage,
    initialChatId,
    provider,
    featureId,
    selectedProgramId,
    buildStreamMessages,
    startStream,
  ]);

  // ストリーミング完了時にメッセージを保存
  useEffect(() => {
    console.log("[FeatureChat] Save effect triggered:", {
      isComplete,
      hasContent: !!content,
      currentChatId,
    });
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
      setMessages((prev) => {
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
  ]);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const displayContent = buildDisplayContent(input, attachedFiles);
    const llmContent = buildLlmContent(input, attachedFiles);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);

    const streamMessages = buildStreamMessages(llmContent, messages);
    await startStream(streamMessages, provider, featureId, selectedProgramId ?? undefined);
  };

  const handleCopy = async () => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const hasMessages = messages.length > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleSuggestionClickは安定
  const handleSuggestionClick = useCallback(
    async (suggestionText: string) => {
      if (isPending || !suggestionText.trim()) return;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: suggestionText.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        const streamMessages = buildStreamMessages(userMessage.content, newMessages.slice(0, -1));
        startStream(streamMessages, provider, featureId, selectedProgramId ?? undefined);
        return newMessages;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending, provider, startStream, buildStreamMessages, selectedProgramId],
  );

  // ユーザーがスクロールを上に動かした場合は自動スクロールを一時停止
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      shouldAutoScrollRef.current = distanceFromBottom < 160;
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 新しいメッセージやストリーミング更新時に下端へスクロール
  // biome-ignore lint/correctness/useExhaustiveDependencies: メッセージ追加時のみ自動スクロールすればよい
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  // ファイル処理関数（ドラッグ&ドロップ用）
  const processFile = useCallback(async (file: File): Promise<AttachedFile> => {
    return new Promise((resolve) => {
      const type = file.type || "application/octet-stream";

      // バイナリファイルは内容を読み込まず、メタ情報のみ保持
      if (!isTextFile(type) && !type.startsWith("image/")) {
        resolve({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type,
          size: file.size,
          content: null,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type,
          size: file.size,
          content: e.target?.result as string,
        });
      };

      if (isTextFile(type)) {
        reader.readAsText(file);
      } else if (type.startsWith("image/")) {
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `ファイルサイズが大きすぎます（最大${MAX_FILE_SIZE_MB}MB）`;
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || isPending || !enableFileAttachment) return;

      setDragError(null);

      const maxFiles = 5;
      if (attachedFiles.length + fileList.length > maxFiles) {
        setDragError(`最大${maxFiles}ファイルまで添付できます`);
        return;
      }

      const newFiles: AttachedFile[] = [];

      for (const file of Array.from(fileList)) {
        const validationError = validateFile(file);
        if (validationError) {
          setDragError(validationError);
          continue;
        }

        try {
          const attachedFile = await processFile(file);
          newFiles.push(attachedFile);
        } catch {
          setDragError(`${file.name} の読み込みに失敗しました`);
        }
      }

      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [attachedFiles, isPending, enableFileAttachment, processFile, validateFile],
  );

  // ドラッグ&ドロップイベントハンドラ
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (!isPending && enableFileAttachment) setIsDragging(true);
    },
    [isPending, enableFileAttachment],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: handleFilesはレンダリング間で安定
    [handleFiles],
  );

  return (
    <section
      aria-label="チャットエリア"
      className={cn("flex flex-col h-full bg-white", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ドラッグ&ドロップオーバーレイ */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center shadow-lg">
            <Paperclip className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">ファイルをドロップ</p>
            <p className="text-sm text-gray-500 mt-1">テキスト、画像、コードファイルに対応</p>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {dragError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2 shadow-lg">
          <X className="w-4 h-4" />
          {dragError}
          <button
            type="button"
            onClick={() => setDragError(null)}
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
        isCopied={isCopied}
        selectedProgramId={selectedProgramId}
        isStreaming={isPending}
        onCopy={handleCopy}
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
        ) : !hasMessages && !isPending ? (
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
                  {suggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
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
              <div key={message.id}>
                {/* 履歴復元時: 保存されたツール呼び出しをグループ化して表示 */}
                {message.role === "assistant" &&
                  message.toolCalls &&
                  message.toolCalls.length > 0 && (
                    <div className="flex gap-3 px-4 py-2">
                      {/* アバター位置と揃えるためのスペーサー */}
                      <div className="flex-shrink-0 w-8" />
                      <div className="flex-1 max-w-[80%] space-y-2">
                        {Object.entries(
                          message.toolCalls.reduce<
                            Record<
                              string,
                              Array<{
                                id: string;
                                name: string;
                                displayName: string;
                                status: "running" | "completed";
                                input?: string;
                              }>
                            >
                          >((groups, tc) => {
                            if (!groups[tc.name]) {
                              groups[tc.name] = [];
                            }
                            groups[tc.name].push(tc);
                            return groups;
                          }, {}),
                        ).map(([toolName, calls]) => (
                          <ToolCallGroup
                            key={`${message.id}-${toolName}`}
                            toolName={toolName}
                            toolCalls={calls.map((tc) => ({
                              id: tc.id,
                              name: tc.name,
                              displayName: tc.displayName,
                              status: tc.status,
                              input: tc.input,
                            }))}
                            citations={message.citations ?? []}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                <MessageBubble
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  llmProvider={message.llmProvider}
                />
                {message.citations && message.citations.length > 0 && (
                  <div className="px-4 max-w-3xl mx-auto">
                    <CitationsList citations={message.citations} />
                  </div>
                )}
              </div>
            ))}

            {/* ストリーミング中または完了後（ツール・要約情報がある場合）は StreamingSteps を表示 */}
            {(isPending ||
              (isComplete && (toolCalls.length > 0 || summarizationEvents.length > 0))) && (
              <StreamingSteps
                content={content}
                toolCalls={toolCalls}
                citations={citations}
                summarizationEvents={summarizationEvents}
                throttleIntervalMs={80}
                usage={usage}
                provider={provider}
                isComplete={isComplete}
                phase={phase}
                connectionStatus={connectionStatus}
              />
            )}

            {/* フォローアップサジェスト（動的生成） */}
            {!isPending && hasMessages && lastAssistantMessage && (
              <div className="px-4 py-4 max-w-3xl mx-auto">
                <FollowUpSuggestions
                  suggestions={followUp.questions.map((q, i) => ({ id: String(i), text: q }))}
                  onSuggestionClick={handleSuggestionClick}
                  isLoading={followUp.isLoading}
                />
              </div>
            )}

            {/* 固定プロンプトサジェスト（設定されている場合） */}
            {!isPending &&
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
          </div>
        )}
      </div>

      <ChatInputArea
        input={input}
        onInputChange={setInput}
        attachedFiles={attachedFiles}
        onFilesChange={setAttachedFiles}
        isStreaming={isPending}
        inputLabel={inputLabel}
        placeholder={placeholder}
        enableFileAttachment={enableFileAttachment}
        onSend={handleSend}
      />
    </section>
  );
}

export default FeatureChat;
