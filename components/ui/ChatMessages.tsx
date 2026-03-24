"use client";

/**
 * ChatMessages
 *
 * FeatureChatから抽出した表示層コンポーネント。
 * メッセージ一覧、ストリーミングステップ、フォローアップサジェスト、エラー表示を担当。
 */

import { Loader2, MessageSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { StreamingSteps } from "@/components/chat";
import { FollowUpSuggestions } from "@/components/chat/FollowUpSuggestions";
import { CitationsList } from "@/components/chat/messages/CitationsList";
import { ToolCallGroup } from "@/components/chat/messages/ToolCallGroup";
import { type PromptSuggestion, PromptSuggestions } from "@/components/chat/PromptSuggestions";
import type {
  CitationInfo,
  ConnectionStatus,
  FollowUpInfo,
  StreamPhase,
  SummarizationEvent,
  ToolCallInfo,
  UsageInfo,
} from "@/hooks/useLLMStream";
import type { LLMProvider } from "@/lib/llm/types";
import type { Message } from "./chat-types";
import { MessageBubble } from "./MessageBubble";

export interface ChatMessagesProps {
  messages: Message[];
  isLoadingHistory: boolean;
  isPending: boolean;
  isComplete: boolean;
  title: string;
  emptyDescription?: string;
  suggestions: string[];
  promptSuggestions: PromptSuggestion[];
  onSuggestionClick: (text: string) => void;

  // LLM stream state
  content: string;
  phase: StreamPhase;
  error: string | null;
  usage: UsageInfo | null;
  toolCalls: ToolCallInfo[];
  citations: CitationInfo[];
  summarizationEvents: SummarizationEvent[];
  followUp: FollowUpInfo;
  connectionStatus: ConnectionStatus;
  provider: LLMProvider;
}

export function ChatMessages({
  messages,
  isLoadingHistory,
  isPending,
  isComplete,
  title,
  emptyDescription,
  suggestions,
  promptSuggestions,
  onSuggestionClick,
  content,
  phase,
  error,
  usage,
  toolCalls,
  citations,
  summarizationEvents,
  followUp,
  connectionStatus,
  provider,
}: ChatMessagesProps) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const hasMessages = messages.length > 0;
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

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

  return (
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

          {suggestions.length > 0 && (
            <div className="mt-8 w-full max-w-lg">
              <p className="text-xs text-gray-400 mb-3">例:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => onSuggestionClick(suggestion)}
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
              {message.role === "assistant" &&
                message.toolCalls &&
                message.toolCalls.length > 0 && (
                  <div className="flex gap-3 px-4 py-2">
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

          {!isPending && hasMessages && lastAssistantMessage && (
            <div className="px-4 py-4 max-w-3xl mx-auto">
              <FollowUpSuggestions
                suggestions={followUp.questions.map((q, i) => ({ id: String(i), text: q }))}
                onSuggestionClick={onSuggestionClick}
                isLoading={followUp.isLoading}
              />
            </div>
          )}

          {!isPending &&
            hasMessages &&
            lastAssistantMessage &&
            promptSuggestions.length > 0 &&
            followUp.questions.length === 0 &&
            !followUp.isLoading && (
              <div className="px-4 py-4 max-w-3xl mx-auto">
                <PromptSuggestions
                  suggestions={promptSuggestions}
                  onSuggestionClick={onSuggestionClick}
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
  );
}
