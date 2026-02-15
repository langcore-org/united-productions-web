"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Send, Loader2, FileSpreadsheet, FileText, Square, Mic, AtSign, Users, MapPin, ShieldCheck } from "lucide-react";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { LLMSelector } from "@/components/ui/LLMSelector";
import { ResearchAgentType, ResearchResponse } from "@/app/api/research/route";
import { LLMProvider } from "@/lib/llm/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  citations?: string[];
  thinking?: string;
}

type StreamState = {
  content: string;
  thinking: string;
  isThinking: boolean;
  isComplete: boolean;
  error: string | null;
};

// エージェント別デフォルトプロバイダー
const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-4.1-fast",
  evidence: "perplexity-sonar",
  location: "perplexity-sonar",
};

// エージェント別サポートプロバイダー
const AGENT_SUPPORTED_PROVIDERS: Record<ResearchAgentType, LLMProvider[]> = {
  people: ["grok-4.1-fast", "grok-4"],
  evidence: ["perplexity-sonar", "perplexity-sonar-pro"],
  location: ["perplexity-sonar", "perplexity-sonar-pro", "grok-4.1-fast", "grok-4"],
};

interface ResearchChatProps {
  className?: string;
}

// エージェント設定
const AGENT_CONFIG: Record<ResearchAgentType, { label: string; icon: React.ReactNode; description: string; placeholder: string }> = {
  people: {
    label: "人探し",
    icon: <Users className="w-5 h-5" />,
    description: "X検索を活用して、特定の人物を効率的に探します。名前、職業、所在地などの手がかりを入力してください。",
    placeholder: "探したい人物について教えてください（名前、職業、所在地など）",
  },
  location: {
    label: "ロケ地探し",
    icon: <MapPin className="w-5 h-5" />,
    description: "撮影に適したロケ地を提案します。雰囲気、エリア、撮影条件などを入力してください。",
    placeholder: "どんなロケ地をお探しですか？",
  },
  evidence: {
    label: "エビデンス",
    icon: <ShieldCheck className="w-5 h-5" />,
    description: "事実を検証し、信頼できる情報源を提示します。確認したい事実を入力してください。",
    placeholder: "確認したい事実を入力してください",
  },
};

export function ResearchChat({ className }: ResearchChatProps) {
  const [activeAgent, setActiveAgent] = useState<ResearchAgentType>("people");
  const [provider, setProvider] = useState<LLMProvider>("grok-4.1-fast");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // エージェント切り替え時にプロバイダーを更新
  useEffect(() => {
    const defaultProvider = AGENT_DEFAULT_PROVIDERS[activeAgent];
    const supportedProviders = AGENT_SUPPORTED_PROVIDERS[activeAgent];
    
    // 現在のプロバイダーがサポートされていない場合、デフォルトに戻す
    if (!supportedProviders.includes(provider)) {
      setProvider(defaultProvider);
    }
  }, [activeAgent, provider]);

  // メッセージ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.content, streamState.thinking]);

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

  // ストリーミング処理
  const handleStream = useCallback(async (userMessage: Message) => {
    setIsStreaming(true);
    setStreamState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });

    // AbortControllerの設定
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/llm/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system" as const,
              content: getSystemPrompt(activeAgent),
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user" as const, content: userMessage.content },
          ],
          provider,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullThinking = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          const data = trimmedLine.slice(6);

          if (data === "[DONE]") {
            setStreamState((prev) => ({ ...prev, isComplete: true }));
            break;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              setStreamState((prev) => ({ ...prev, error: parsed.error }));
              break;
            }

            // 思考プロセスの処理
            if (parsed.thinking) {
              fullThinking += parsed.thinking;
              setStreamState((prev) => ({
                ...prev,
                thinking: fullThinking,
                isThinking: true,
              }));
            }

            // コンテンツの処理
            if (parsed.content) {
              fullContent += parsed.content;
              setStreamState((prev) => ({
                ...prev,
                content: fullContent,
                isThinking: false,
              }));
            }
          } catch {
            continue;
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6);
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
              }
            } catch {
              // Ignore
            }
          }
        }
      }

      // メッセージを追加
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: fullContent,
          timestamp: new Date(),
          llmProvider: provider,
          thinking: fullThinking || undefined,
        },
      ]);

      setStreamState((prev) => ({ ...prev, isComplete: true }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // ユーザーによるキャンセル
        return;
      }
      setStreamState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isComplete: true,
      }));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [activeAgent, messages, provider]);

  // 従来の非ストリーミング処理（フォールバック）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNonStream = useCallback(async (userMessage: Message) => {
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: activeAgent,
          query: userMessage.content,
          provider,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ResearchResponse = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          llmProvider: provider,
          citations: data.citations,
        },
      ]);
    } catch (error) {
      console.error("Research error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "エラーが発生しました。もう一度お試しください。",
          timestamp: new Date(),
          llmProvider: provider,
        },
      ]);
    }
  }, [activeAgent, provider]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // ストリーミングを使用
    await handleStream(userMessage);

    setIsLoading(false);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    
    // 現在のストリーム内容をメッセージとして保存
    if (streamState.content) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: streamState.content + "\n\n（生成が中断されました）",
          timestamp: new Date(),
          llmProvider: provider,
          thinking: streamState.thinking || undefined,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const exportToCSV = () => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length === 0) return;

    const content = assistantMessages[assistantMessages.length - 1].content;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-${activeAgent}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToMarkdown = () => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length === 0) return;

    const content = assistantMessages[assistantMessages.length - 1].content;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-${activeAgent}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasAssistantMessage = messages.some((m) => m.role === "assistant");
  const currentAgent = AGENT_CONFIG[activeAgent];

  return (
    <div className={cn("flex flex-col h-full bg-[#0d0d12] relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35] bg-[#0d0d12]">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">リサーチ・考査</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[#ff6b00]/20 text-[#ff6b00]">
            PJ-C
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              ストリーミング中
            </span>
          )}
        </div>
        <LLMSelector
          value={provider}
          onChange={setProvider}
          supportedProviders={AGENT_SUPPORTED_PROVIDERS[activeAgent]}
          recommendedProvider={AGENT_DEFAULT_PROVIDERS[activeAgent]}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-64">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-[#1a1a24] border border-[#2a2a35] flex items-center justify-center mb-6">
              <span className="text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-medium text-white mb-3">
              {currentAgent.label}エージェント
            </h3>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              {currentAgent.description}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                llmProvider={message.llmProvider}
                thinkingContent={message.thinking}
              />
            ))}
            
            {/* ストリーミング中のメッセージ */}
            {isStreaming && (
              <StreamingMessageBubble
                content={streamState.content}
                thinking={streamState.thinking}
                isThinking={streamState.isThinking}
                provider={provider}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Export Buttons - Floating */}
      {hasAssistantMessage && !isStreaming && (
        <div className="absolute top-20 right-6 flex gap-2">
          <button
            onClick={exportToCSV}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-xs text-gray-400 hover:text-white",
              "bg-[#1a1a24] border border-[#2a2a35]",
              "hover:bg-[#2a2a35] transition-colors"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToMarkdown}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-xs text-gray-400 hover:text-white",
              "bg-[#1a1a24] border border-[#2a2a35]",
              "hover:bg-[#2a2a35] transition-colors"
            )}
          >
            <FileText className="w-4 h-4" />
            Markdown
          </button>
        </div>
      )}

      {/* Fixed Bottom Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0d0d12] pb-6 pt-2 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Mode Selector Pills */}
          <div className="flex justify-center gap-2 mb-4">
            {(Object.keys(AGENT_CONFIG) as ResearchAgentType[]).map((agentType) => {
              const agent = AGENT_CONFIG[agentType];
              const isActive = activeAgent === agentType;
              return (
                <button
                  key={agentType}
                  onClick={() => setActiveAgent(agentType)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                    "transition-all duration-200",
                    isActive
                      ? "bg-[#ff6b00]/20 text-[#ff6b00] border border-[#ff6b00]/30"
                      : "bg-[#1a1a24] text-gray-400 border border-[#2a2a35] hover:text-white hover:bg-[#2a2a35]"
                  )}
                >
                  {agent.icon}
                  {agent.label}
                </button>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="relative flex items-center">
            {/* @ Attachment Button */}
            <button
              className={cn(
                "absolute left-4 z-10",
                "w-8 h-8 rounded-full flex items-center justify-center",
                "text-gray-400 hover:text-white hover:bg-[#2a2a35]",
                "transition-colors"
              )}
              title="添付"
            >
              <AtSign className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentAgent.placeholder}
              className={cn(
                "w-full bg-[#1a1a24] border border-[#2a2a35] rounded-full",
                "pl-14 pr-16 py-4 text-sm text-white placeholder-gray-500",
                "focus:outline-none focus:border-[#ff6b00]/50",
                "resize-none min-h-[56px] max-h-[200px]",
                "shadow-lg shadow-black/20"
              )}
              rows={1}
              disabled={isLoading || isStreaming}
            />

            {/* Voice Input Button (Black Circle) */}
            <button
              className={cn(
                "absolute right-14 z-10",
                "w-8 h-8 rounded-full flex items-center justify-center",
                "bg-black border border-[#3a3a45]",
                "text-gray-300 hover:text-white hover:bg-[#1a1a24]",
                "transition-colors"
              )}
              title="音声入力"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send/Stop Button */}
            {isStreaming ? (
              <button
                onClick={handleCancel}
                className={cn(
                  "absolute right-4 z-10",
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "bg-red-500 text-white hover:bg-red-600",
                  "transition-colors"
                )}
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-4 z-10",
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  "transition-colors",
                  input.trim() && !isLoading
                    ? "bg-[#ff6b00] text-white hover:bg-[#ff6b00]/90"
                    : "bg-[#2a2a35] text-gray-500 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Hint Text */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            {isStreaming ? (
              <span className="text-green-400">生成中... 停止するにはボタンをクリック</span>
            ) : (
              "Enterで送信 / Shift+Enterで改行"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ストリーミング中のメッセージバブル
 */
function StreamingMessageBubble({
  content,
  thinking,
  provider,
}: {
  content: string;
  thinking: string;
  isThinking?: boolean;
  provider: LLMProvider;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [content, thinking]);

  return (
    <div className="flex gap-4 py-4 px-4 flex-row" ref={contentRef}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a24] border border-[#2a2a35]">
        <Loader2 className="w-4 h-4 text-[#ff6b00] animate-spin" />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[80%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 justify-start">
          <span className="text-sm font-medium text-gray-300">AI Assistant</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a35] text-[#ff6b00]">
            {provider}
          </span>
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            生成中...
          </span>
        </div>

        {/* Thinking Process */}
        {thinking && (
          <div className="mb-3 p-3 rounded-lg bg-[#0d0d12] border border-[#2a2a35]">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
              <span className="text-xs text-[#22c55e] font-medium">思考プロセス</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
              {thinking}
            </p>
          </div>
        )}

        {/* Message Content */}
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[#1a1a24] border border-[#2a2a35] text-gray-100 rounded-tl-sm">
          {content ? (
            <div className="whitespace-pre-wrap">
              {content}
              <span className="inline-block w-1.5 h-4 bg-[#ff6b00] ml-0.5 animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
              </div>
              <span className="text-xs">考え中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * エージェント別システムプロンプト
 */
function getSystemPrompt(agentType: ResearchAgentType): string {
  switch (agentType) {
    case "people":
      return `あなたは人物リサーチの専門家です。X（旧Twitter）検索を活用して、特定の人物を効率的に探すお手伝いをします。

以下の点に注意して回答してください：
- 人物の特定に役立つ情報（名前、職業、所在地、SNSアカウントなど）を整理
- 信頼できる情報源がある場合は提示
- プライバシーに配慮し、公開情報のみを扱う
- 日本のテレビ制作現場で使用される形式で出力`;

    case "location":
      return `あなたはロケ地リサーチの専門家です。撮影に適したロケーションを提案します。

以下の点に注意して回答してください：
- 撮影条件（雰囲気、エリア、アクセス、許可など）を考慮
- 具体的な場所名や住所を提示可能な場合は提示
- 撮影許可が必要な場合はその旨を明記
- 代替案も複数提示
- 日本のテレビ制作現場で使用される形式で出力`;

    case "evidence":
      return `あなたは事実確認の専門家です。エビデンスに基づいた検証を行います。

以下の点に注意して回答してください：
- 事実と意見を明確に区別
- 信頼できる情報源（公的機関、権威あるメディア等）を提示
- 不確かな情報は「未確認」として明記
- 複数の視点からの情報を提示
- 日本のテレビ制作現場で使用される形式で出力`;

    default:
      return "あなたは調査リサーチの専門家です。";
  }
}
