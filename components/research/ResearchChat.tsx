"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { LLMSelector } from "@/components/ui/LLMSelector";
import { AgentTabs } from "./AgentTabs";
import { ResearchAgentType, ResearchResponse } from "@/app/api/research/route";
import { LLMProvider } from "@/lib/llm/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  citations?: string[];
  isStreaming?: boolean;
}

// エージェント別デフォルトプロバイダー
const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-41-fast",
  evidence: "perplexity-sonar",
  location: "perplexity-sonar",
};

// エージェント別サポートプロバイダー
const AGENT_SUPPORTED_PROVIDERS: Record<ResearchAgentType, LLMProvider[]> = {
  people: ["grok-41-fast", "grok-4"],
  evidence: ["perplexity-sonar", "perplexity-sonar-pro"],
  location: ["perplexity-sonar", "perplexity-sonar-pro", "grok-41-fast", "grok-4"],
};

interface ResearchChatProps {
  className?: string;
}

export function ResearchChat({ className }: ResearchChatProps) {
  const [activeAgent, setActiveAgent] = useState<ResearchAgentType>("people");
  const [provider, setProvider] = useState<LLMProvider>("grok-41-fast");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [messages]);

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

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // アシスタントメッセージを追加（ストリーミング用）
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        llmProvider: provider,
        isStreaming: true,
      },
    ]);

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

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: data.content,
                citations: data.citations,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Research error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "エラーが発生しました。もう一度お試しください。",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
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

  const hasAssistantMessage = messages.some((m) => m.role === "assistant" && !m.isStreaming);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a35]">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">リサーチ・考査</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-[#ff6b00]/20 text-[#ff6b00]">
            PJ-C
          </span>
        </div>
        <LLMSelector
          value={provider}
          onChange={setProvider}
          supportedProviders={AGENT_SUPPORTED_PROVIDERS[activeAgent]}
          recommendedProvider={AGENT_DEFAULT_PROVIDERS[activeAgent]}
        />
      </div>

      {/* Agent Tabs */}
      <div className="px-6 py-4">
        <AgentTabs activeAgent={activeAgent} onChange={setActiveAgent} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {activeAgent === "people" && "人探しエージェント"}
              {activeAgent === "location" && "ロケ地探しエージェント"}
              {activeAgent === "evidence" && "エビデンス確認エージェント"}
            </h3>
            <p className="text-sm text-gray-400 max-w-md">
              {activeAgent === "people" &&
                "X検索を活用して、特定の人物を効率的に探します。名前、職業、所在地などの手がかりを入力してください。"}
              {activeAgent === "location" &&
                "撮影に適したロケ地を提案します。雰囲気、エリア、撮影条件などを入力してください。"}
              {activeAgent === "evidence" &&
                "事実を検証し、信頼できる情報源を提示します。確認したい事実を入力してください。"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                llmProvider={message.llmProvider}
                isThinking={message.isStreaming}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Export Buttons */}
      {hasAssistantMessage && (
        <div className="px-6 py-2 border-t border-[#2a2a35] flex gap-2">
          <button
            onClick={exportToCSV}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-xs text-gray-400 hover:text-white",
              "hover:bg-[#2a2a35] transition-colors"
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSVエクスポート
          </button>
          <button
            onClick={exportToMarkdown}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "text-xs text-gray-400 hover:text-white",
              "hover:bg-[#2a2a35] transition-colors"
            )}
          >
            <FileText className="w-4 h-4" />
            Markdownエクスポート
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-[#2a2a35]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${
              activeAgent === "people"
                ? "探したい人物について教えてください（名前、職業、所在地など）"
                : activeAgent === "location"
                ? "どんなロケ地をお探しですか？"
                : "確認したい事実を入力してください"
            }`}
            className={cn(
              "w-full bg-[#1a1a24] border border-[#2a2a35] rounded-xl",
              "px-4 py-3 pr-12 text-sm text-white placeholder-gray-500",
              "focus:outline-none focus:border-[#ff6b00]/50",
              "resize-none min-h-[56px] max-h-[200px]"
            )}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              "absolute right-3 bottom-3",
              "w-8 h-8 rounded-lg flex items-center justify-center",
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
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Enterで送信 / Shift+Enterで改行
        </div>
      </div>
    </div>
  );
}
