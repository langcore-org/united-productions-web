"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessageType, ChatStreamState } from "@/components/chat";
import { LLMProvider } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("useChat");

interface UseChatOptions {
  systemPrompt: string;
  provider: LLMProvider;
  apiEndpoint?: string;
}

export function useChat(options: UseChatOptions) {
  const { systemPrompt, provider, apiEndpoint = "/api/llm/stream" } = options;

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamState, setStreamState] = useState<ChatStreamState>({
    content: "",
    thinking: "",
    isThinking: false,
    isComplete: false,
    error: null,
    toolCalls: [],
    toolUsage: undefined,
    reasoningSteps: [],
    reasoningTokens: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStream = useCallback(
    async (userMessage: ChatMessageType) => {
      const requestId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`[${requestId}] Starting stream handler`, {
        provider,
        messageCount: messages.length + 1,
      });

      setIsStreaming(true);
      setStreamState({
        content: "",
        thinking: "",
        isThinking: false,
        isComplete: false,
        error: null,
        toolCalls: [],
        toolUsage: undefined,
        reasoningSteps: [],
        reasoningTokens: 0,
      });

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const requestBody = {
          messages: [
            {
              role: "system" as const,
              content: systemPrompt,
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user" as const, content: userMessage.content },
          ],
          provider,
        };

        logger.info(`[${requestId}] Sending request`, { endpoint: apiEndpoint });
        logger.debug(`[${requestId}] Request body`, { body: requestBody });

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        logger.info(`[${requestId}] Response received`, { status: response.status });

        if (!response.ok) {
          let errorData: { error?: string; message?: string; requestId?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            // JSONパース失敗時は無視
          }
          
          const errorMessage = errorData.message || errorData.error || `HTTP error: ${response.status}`;
          logger.error(`[${requestId}] HTTP error`, { 
            status: response.status, 
            error: errorMessage,
            serverRequestId: errorData.requestId,
          });
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          logger.error(`[${requestId}] Response body is not readable`);
          throw new Error("Response body is not readable");
        }

        logger.info(`[${requestId}] Starting to read stream`);

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let fullThinking = "";
        let chunkCount = 0;
        const toolCallsMap = new Map<string, { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed' }>();
        const reasoningStepsList: { step: number; content: string; tokens?: number }[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            logger.info(`[${requestId}] Stream reader done`, { chunkCount });
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;

            const data = trimmedLine.slice(6);

            if (data === "[DONE]") {
              logger.info(`[${requestId}] Stream done marker received`);
              setStreamState((prev) => ({ ...prev, isComplete: true }));
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                logger.error(`[${requestId}] Error in stream data`, { error: parsed.error });
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
                chunkCount++;
                fullContent += parsed.content;
                setStreamState((prev) => ({
                  ...prev,
                  content: fullContent,
                  isThinking: false,
                }));
              }

              // ツール呼び出し
              if (parsed.toolCall) {
                const tc = parsed.toolCall;
                toolCallsMap.set(tc.id, { ...tc });
                setStreamState((prev) => ({
                  ...prev,
                  toolCalls: Array.from(toolCallsMap.values()),
                }));
              }

              // 思考ステップ
              if (parsed.reasoning) {
                const existingIndex = reasoningStepsList.findIndex(r => r.step === parsed.reasoning.step);
                if (existingIndex >= 0) {
                  reasoningStepsList[existingIndex] = { ...reasoningStepsList[existingIndex], ...parsed.reasoning };
                } else {
                  reasoningStepsList.push(parsed.reasoning);
                }
                setStreamState((prev) => ({
                  ...prev,
                  reasoningSteps: [...reasoningStepsList],
                  reasoningTokens: parsed.reasoning.tokens || prev.reasoningTokens,
                }));
              }

              // ツール使用状況
              if (parsed.toolUsage) {
                setStreamState((prev) => ({
                  ...prev,
                  toolUsage: parsed.toolUsage,
                }));
              }
            } catch (parseError) {
              logger.warn(`[${requestId}] Failed to parse SSE data`, { data, error: parseError });
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

        logger.info(`[${requestId}] Stream completed`, { 
          contentLength: fullContent.length,
          thinkingLength: fullThinking.length,
          chunkCount,
        });

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
          logger.info(`[${requestId}] Stream aborted by user`);
          return;
        }
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`[${requestId}] Stream error`, { error: errorMessage });
        
        setStreamState((prev) => ({
          ...prev,
          error: errorMessage,
          isComplete: true,
        }));
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        logger.info(`[${requestId}] Stream handler completed`);
      }
    },
    [messages, provider, systemPrompt, apiEndpoint]
  );

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || isStreaming) {
      logger.warn("Submit prevented", { 
        hasInput: !!input.trim(), 
        isLoading, 
        isStreaming 
      });
      return;
    }

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    logger.info("Submitting message", { contentLength: userMessage.content.length });

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await handleStream(userMessage);
    } catch (error) {
      logger.error("Submit error", { error });
    } finally {
      setIsLoading(false);
      logger.info("Submit completed");
    }
  };

  const handleCancel = () => {
    logger.info("Cancelling stream");
    
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
    logger.info("Clearing messages");
    setMessages([]);
    setStreamState({
      content: "",
      thinking: "",
      isThinking: false,
      isComplete: false,
      error: null,
    });
  };

  const exportToMarkdown = () => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length === 0) return;

    const content = assistantMessages[assistantMessages.length - 1].content;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    // State
    messages,
    input,
    isLoading,
    isStreaming,
    streamState,

    // Setters
    setInput,

    // Actions
    handleSubmit,
    handleCancel,
    handleKeyDown,
    clearMessages,
    exportToMarkdown,
  };
}
