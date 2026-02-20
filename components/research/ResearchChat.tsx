"use client";

import { cn } from "@/lib/utils";
import { FileSpreadsheet, FileText, Trash2, AlertCircle } from "lucide-react";

import { useResearchChat } from "@/hooks/useResearchChat";
import { AgentTabs } from "./AgentTabs";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { StreamingMessage } from "@/components/ui/StreamingMessage";


interface ResearchChatProps {
  className?: string;
}

export function ResearchChat({ className }: ResearchChatProps) {
  const {
    activeAgent,
    provider,
    messages,
    input,
    isLoading,
    isStreaming,
    streamState,
    messagesEndRef,
    setActiveAgent,
    setInput,
    handleSubmit,
    handleCancel,
    handleKeyDown,
    clearMessages,
    exportToCSV,
    exportToMarkdown,
  } = useResearchChat();

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <header className="flex-none border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <AgentTabs activeAgent={activeAgent} onChange={setActiveAgent} />

        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState agent={activeAgent} onSuggestionClick={setInput} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Streaming Message */}
            {isStreaming && (
              <StreamingMessage
                content={streamState.content}
                thinking={streamState.thinking}
                provider={provider}
              />
            )}

            {/* Error Message */}
            {streamState.error && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100">
                  <AlertCircle className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-600">エラー</span>
                  </div>
                  <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-sm">
                    <div className="whitespace-pre-wrap">{streamState.error}</div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Export Actions */}
      {messages.length > 0 && (
        <div className="flex-none border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={exportToMarkdown}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Markdown
              </button>
            </div>
            <button
              onClick={clearMessages}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              クリア
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        isStreaming={isStreaming}
        activeAgent={activeAgent}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
