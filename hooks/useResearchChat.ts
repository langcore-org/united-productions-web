"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ResearchAgentType, ResearchMessage, ResearchStreamState } from "@/types/research";
import { LLMProvider } from "@/lib/llm/types";
import { AGENT_DEFAULT_PROVIDERS, AGENT_SUPPORTED_PROVIDERS } from "@/lib/research/config";
import { getSystemPrompt } from "@/lib/research/prompts";

interface UseResearchChatOptions {
  initialAgent?: ResearchAgentType;
}

export function useResearchChat(options: UseResearchChatOptions = {}) {
  const { initialAgent = "people" } = options;
  
  const [activeAgent, setActiveAgent] = useState<ResearchAgentType>(initialAgent);
  const [provider, setProvider] = useState<LLMProvider>(AGENT_DEFAULT_PROVIDERS[initialAgent]);
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamState, setStreamState] = useState<ResearchStreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // エージェント切り替え時にプロバイダーを更新
  useEffect(() => {
    const defaultProvider = AGENT_DEFAULT_PROVIDERS[activeAgent];
    const supportedProviders = AGENT_SUPPORTED_PROVIDERS[activeAgent];
    
    if (!supportedProviders.includes(provider)) {
      setProvider(defaultProvider);
    }
  }, [activeAgent, provider]);

  // メッセージ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.content, streamState.thinking]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStream = useCallback(async (userMessage: ResearchMessage) => {
    setIsStreaming(true);
    setStreamState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });

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

            if (parsed.thinking) {
              fullThinking += parsed.thinking;
              setStreamState((prev) => ({
                ...prev,
                thinking: fullThinking,
                isThinking: true,
              }));
            }

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

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: ResearchMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    await handleStream(userMessage);

    setIsLoading(false);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    
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

  const clearMessages = () => {
    setMessages([]);
    setStreamState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });
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

  return {
    // State
    activeAgent,
    provider,
    messages,
    input,
    isLoading,
    isStreaming,
    streamState,
    messagesEndRef,
    
    // Setters
    setActiveAgent,
    setInput,
    
    // Actions
    handleSubmit,
    handleCancel,
    handleKeyDown,
    clearMessages,
    exportToCSV,
    exportToMarkdown,
  };
}
