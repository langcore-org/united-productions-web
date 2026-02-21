"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, RotateCcw, Bot, CheckCircle2, BrainCircuit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./MessageBubble";
import { AttachedFile } from "./FileAttachment";
import { ChatHeader } from "./ChatHeader";
import { ChatInputArea } from "./ChatInputArea";
import { DEFAULT_PROVIDER } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { useLLMStream, ToolCallInfo, ReasoningStepInfo } from "@/components/ui/StreamingMessage";
import type { ToolOptions } from "@/lib/chat/chat-config";
import { PromptSuggestions, PromptSuggestion } from "@/components/chat/PromptSuggestions";
import { useConversationSave } from "@/hooks/useConversationSave";
import { getToolConfig } from "@/lib/tools/config";

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    resetStream,
  } = useLLMStream();

  // 不要なフック呼び出しを削除（thinkingStepsは直接使用しない）

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
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
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
  useEffect(() => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserScrolling]);

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

  const buildStreamPayload = (userContent: string, history: Message[]) => {
    const conversationHistory = history.map((m) => ({ role: m.role, content: m.content }));
    const effectiveToolOptions = provider.startsWith("grok-") ? toolOptions : undefined;
    return {
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content: userContent },
      ],
      effectiveToolOptions,
    };
  };

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

    const { messages: streamMessages, effectiveToolOptions } = buildStreamPayload(
      userMessage.content,
      messages,
    );
    await startStream(streamMessages, provider, effectiveToolOptions);
  };

  const handleRegenerate = async () => {
    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserIndex;
    const lastUserMessage = messages[actualIndex];
    const newMessages = messages.slice(0, actualIndex);
    setMessages(newMessages);

    const { messages: streamMessages, effectiveToolOptions } = buildStreamPayload(
      lastUserMessage.content,
      newMessages,
    );
    await startStream(streamMessages, provider, effectiveToolOptions);
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
      const { messages: streamMessages, effectiveToolOptions } = buildStreamPayload(
        userMessage.content,
        messages,
      );
      await startStream(streamMessages, provider, effectiveToolOptions);
    },
    [isStreaming, messages, provider, systemPrompt, toolOptions, startStream],
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
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 rounded bg-gray-100 border border-gray-200">Ctrl + Enter</span>
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
                thinking={thinking}
                toolCalls={toolCalls}
                reasoningSteps={reasoningSteps}
                toolUsage={toolUsage}
                usage={usage}
                provider={provider}
                isComplete={isComplete}
              />
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

// ============================================
// ストリーミングステップ表示コンポーネント
// ============================================

interface StreamingStepsProps {
  content: string;
  thinking: string;
  toolCalls: ToolCallInfo[];
  reasoningSteps: ReasoningStepInfo[];
  toolUsage: { web_search_calls?: number; x_search_calls?: number; code_interpreter_calls?: number; file_search_calls?: number; mcp_calls?: number; document_search_calls?: number } | null;
  usage: { inputTokens: number; outputTokens: number; cost: number } | null;
  provider: LLMProvider | string;
  isComplete: boolean;
}

function StreamingSteps({
  content,
  thinking,
  toolCalls,
  reasoningSteps,
  toolUsage,
  usage,
  provider,
  isComplete,
}: StreamingStepsProps) {
  // 重複を除去したツール呼び出し
  const uniqueToolCalls = toolCalls.filter((call, index, self) => 
    index === self.findIndex((c) => c.id === call.id)
  );

  // 完了したツール呼び出し
  const completedToolCalls = uniqueToolCalls.filter((call) => call.status === "completed");
  // 実行中のツール呼び出し
  const runningToolCalls = uniqueToolCalls.filter((call) => call.status === "running");

  // reasoningStepsのcontentをパースしてサブステップに分割
  // サーバーからは step: 1 で content に複数ステップが含まれる形式で送られてくる
  const parsedReasoningSteps = reasoningSteps.flatMap((step) => {
    const subSteps = parseSubSteps(step.content);
    return subSteps.map((subStep, index) => ({
      step: index + 1,
      content: `${subStep.title}: ${subStep.content}`,
      tokens: index === subSteps.length - 1 ? step.tokens : undefined,
    }));
  });

  // 完了した思考ステップ（最後のステップが完了している場合は全て完了とみなす）
  const isReasoningComplete = isComplete && parsedReasoningSteps.length > 0;
  const completedReasoningSteps = isReasoningComplete 
    ? parsedReasoningSteps 
    : parsedReasoningSteps.slice(0, -1);
  // 現在の思考ステップ（実行中のみ）
  const currentReasoningStep = isReasoningComplete ? null : parsedReasoningSteps[parsedReasoningSteps.length - 1];
  const hasCurrentReasoning = !isReasoningComplete && parsedReasoningSteps.length > 0;

  return (
    <div className="space-y-3">
      {/* 完了したツール呼び出し - 各ツールを個別のメッセージとして表示 */}
      {completedToolCalls.map((toolCall) => (
        <ToolCallMessage key={toolCall.id} toolCall={toolCall} status="completed" provider={provider} />
      ))}

      {/* 実行中のツール呼び出し */}
      {runningToolCalls.map((toolCall) => (
        <ToolCallMessage key={toolCall.id} toolCall={toolCall} status="running" provider={provider} />
      ))}

      {/* 完了した思考ステップ - 各ステップを個別のメッセージとして表示 */}
      {completedReasoningSteps.map((step) => (
        <ThinkingStepMessage key={step.step} step={step} provider={provider} />
      ))}

      {/* 現在の思考ステップ（実行中） */}
      {hasCurrentReasoning && currentReasoningStep && (
        <ThinkingStepMessage step={currentReasoningStep} provider={provider} isActive />
      )}

      {/* レガシー思考表示 */}
      {thinking && reasoningSteps.length === 0 && (
        <LegacyThinkingMessage thinking={thinking} provider={provider} isComplete={isComplete} />
      )}

      {/* メインコンテンツ */}
      {(content || !isComplete) && (
        <ContentMessage 
          content={content} 
          provider={provider} 
          isComplete={isComplete}
          toolUsage={toolUsage}
          usage={usage}
        />
      )}
    </div>
  );
}

// ツール呼び出しメッセージ
interface ToolCallMessageProps {
  toolCall: ToolCallInfo;
  status: "completed" | "running" | "failed";
  provider: LLMProvider | string;
}

function ToolCallMessage({ toolCall, status, provider }: ToolCallMessageProps) {
  const config = getToolConfig(toolCall.type, toolCall.name);
  const Icon = config.icon;

  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm">
          <div className="flex items-center gap-2">
            {status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            <span className="font-medium">{config.label}</span>
            {toolCall.input && (
              <span className="text-blue-700/70 text-xs truncate max-w-[200px]">
                {toolCall.input}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 思考ステップメッセージ
interface ThinkingStepMessageProps {
  step: ReasoningStepInfo;
  provider: LLMProvider | string;
  isActive?: boolean;
}

function ThinkingStepMessage({ step, provider, isActive }: ThinkingStepMessageProps) {
  // content内に複数のサブステップ（分析、計画、実行など）が含まれている場合、それらを個別に表示
  const subSteps = parseSubSteps(step.content);
  const hasSubSteps = subSteps.length > 1;

  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
        {isActive ? (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-white" />
        )}
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              思考中...
            </span>
          )}
        </div>
        
        {/* サブステップが複数ある場合は個別に表示 */}
        {hasSubSteps ? (
          <div className="space-y-2">
            {subSteps.map((subStep, index) => (
              <div 
                key={index}
                className="relative px-4 py-2 text-sm leading-relaxed rounded-xl bg-purple-50 text-purple-900 border border-purple-200"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-medium text-purple-800">{subStep.title}</span>
                    <p className="whitespace-pre-wrap text-purple-900/80">{subStep.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-sm">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                {step.step}
              </span>
              <p className="whitespace-pre-wrap">{step.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ステップ内容をパースしてサブステップに分割
interface SubStep {
  title: string;
  content: string;
}

function parseSubSteps(content: string): SubStep[] {
  // 「分析:」「計画:」「実行:」「統合:」「出力:」などのパターンで分割
  const patterns = [
    /^分析[:：]\s*/m,
    /^計画[:：]\s*/m,
    /^実行[:：]\s*/m,
    /^統合[:：]\s*/m,
    /^出力[:：]\s*/m,
    /^検索[:：]\s*/m,
    /^調査[:：]\s*/m,
    /^確認[:：]\s*/m,
    /^まとめ[:：]\s*/m,
    /^結論[:：]\s*/m,
  ];
  
  const lines = content.split('\n');
  const subSteps: SubStep[] = [];
  let currentSubStep: SubStep | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // 新しいサブステップの開始を検出
    const matchedPattern = patterns.find(p => p.test(trimmedLine));
    
    if (matchedPattern) {
      // 前のサブステップを保存
      if (currentSubStep) {
        subSteps.push(currentSubStep);
      }
      // 新しいサブステップを開始
      const title = trimmedLine.split(/[:：]/)[0];
      const content = trimmedLine.replace(matchedPattern, '').trim();
      currentSubStep = { title, content };
    } else if (currentSubStep) {
      // 現在のサブステップに追加
      currentSubStep.content += '\n' + trimmedLine;
    } else {
      // 最初のサブステップ（タイトルなし）
      currentSubStep = { title: '思考', content: trimmedLine };
    }
  }
  
  // 最後のサブステップを保存
  if (currentSubStep) {
    subSteps.push(currentSubStep);
  }
  
  return subSteps.length > 0 ? subSteps : [{ title: '思考', content }];
}

// レガシー思考メッセージ
interface LegacyThinkingMessageProps {
  thinking: string;
  provider: LLMProvider | string;
  isComplete: boolean;
}

function LegacyThinkingMessage({ thinking, provider, isComplete }: LegacyThinkingMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg">
        {!isComplete ? (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-white" />
        )}
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          {!isComplete && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              思考中...
            </span>
          )}
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-sm">
          <p className="whitespace-pre-wrap text-xs">{thinking}</p>
        </div>
      </div>
    </div>
  );
}

// メインコンテンツメッセージ
interface ContentMessageProps {
  content: string;
  provider: LLMProvider | string;
  isComplete: boolean;
  toolUsage: { web_search_calls?: number; x_search_calls?: number; code_interpreter_calls?: number; file_search_calls?: number; mcp_calls?: number; document_search_calls?: number } | null;
  usage: { inputTokens: number; outputTokens: number; cost: number } | null;
}

function ContentMessage({ content, provider, isComplete, toolUsage, usage }: ContentMessageProps) {
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
        {isComplete ? (
          <Bot className="w-4 h-4 text-white" />
        ) : (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        )}
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
          {!isComplete && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
              生成中...
            </span>
          )}
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
          {content ? (
            <div className="whitespace-pre-wrap">
              {content}
              {!isComplete && (
                <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-400 py-1">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
              <span className="text-xs">考え中...</span>
            </div>
          )}
        </div>
        
        {/* Usage Info */}
        {isComplete && usage && (
          <div className="mt-2 text-xs text-gray-400">
            {usage.inputTokens.toLocaleString()} 入力 / {usage.outputTokens.toLocaleString()} 出力
            {" "}• ${usage.cost.toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
}

export default FeatureChat;
