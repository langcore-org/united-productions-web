"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessageType, ChatStreamState } from "@/components/chat";
import { LLMProvider } from "@/lib/llm/types";
import { createClientLogger } from "@/lib/logger";
import { ProcessingStep, defaultProcessingSteps, startProcessingStep, completeProcessingStep, failProcessingStep } from "@/components/chat/ProcessingFlow";
import { parseSSEStream } from '@/lib/llm/sse-parser';

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
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);

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
      // 処理フローを初期化
      const initialSteps = defaultProcessingSteps.map(s => ({ ...s }));
      setProcessingSteps(initialSteps);
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
      
      // ステップ1: ユーザー入力を完了
      setProcessingSteps(prev => completeProcessingStep(prev, "user-input"));

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // ステップ2: リクエスト準備
        setProcessingSteps(prev => startProcessingStep(prev, "request-prepare"));
        
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
        
        setProcessingSteps(prev => completeProcessingStep(prev, "request-prepare"));
        
        // ステップ3: APIリクエスト
        setProcessingSteps(prev => startProcessingStep(prev, "api-request"));

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });
        
        setProcessingSteps(prev => completeProcessingStep(prev, "api-request"));

        logger.info(`[${requestId}] Response received`, { status: response.status });
        
        // ステップ4: LLM処理開始
        setProcessingSteps(prev => startProcessingStep(prev, "llm-processing"));

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

        // ステップ5: ツール実行（必要に応じて）
        setProcessingSteps(prev => startProcessingStep(prev, "tool-execution"));

        // ステップ6: ストリーミング
        setProcessingSteps(prev => completeProcessingStep(prev, "tool-execution"));
        setProcessingSteps(prev => startProcessingStep(prev, "streaming"));

        let fullContent = "";
        let fullThinking = "";
        let chunkCount = 0;
        const toolCallsMap = new Map<string, { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed' }>();
        const reasoningStepsList: { step: number; content: string; tokens?: number }[] = [];

        for await (const event of parseSSEStream(reader)) {
          if (event.error) {
            logger.error(`[${requestId}] Error in stream data`, { error: event.error });
            setStreamState((prev) => ({ ...prev, error: event.error! }));
            break;
          }

          if (event.thinking) {
            fullThinking += event.thinking;
            setStreamState((prev) => ({
              ...prev,
              thinking: fullThinking,
              isThinking: true,
            }));
          }

          if (event.content) {
            chunkCount++;
            fullContent += event.content;
            setStreamState((prev) => ({
              ...prev,
              content: fullContent,
              isThinking: false,
            }));
          }

          if (event.toolCall) {
            const tc = event.toolCall;
            toolCallsMap.set(tc.id, { ...tc });
            setStreamState((prev) => ({
              ...prev,
              toolCalls: Array.from(toolCallsMap.values()),
            }));
          }

          if (event.reasoning) {
            const existingIndex = reasoningStepsList.findIndex(r => r.step === event.reasoning!.step);
            if (existingIndex >= 0) {
              reasoningStepsList[existingIndex] = { ...reasoningStepsList[existingIndex], ...event.reasoning };
            } else {
              reasoningStepsList.push(event.reasoning);
            }
            setStreamState((prev) => ({
              ...prev,
              reasoningSteps: [...reasoningStepsList],
              reasoningTokens: event.reasoning!.tokens ?? prev.reasoningTokens,
            }));
          }

          if (event.toolUsage) {
            setStreamState((prev) => ({
              ...prev,
              toolUsage: event.toolUsage,
            }));
          }

          if (event.done) {
            logger.info(`[${requestId}] Stream done marker received`);
            setStreamState((prev) => ({ ...prev, isComplete: true }));
          }
        }

        logger.info(`[${requestId}] Stream reader done`, { chunkCount });
        // ステップ7: レスポンス解析
        setProcessingSteps(prev => completeProcessingStep(prev, "streaming"));
        setProcessingSteps(prev => startProcessingStep(prev, "response-parse"));
        
        logger.info(`[${requestId}] Stream completed`, { 
          contentLength: fullContent.length,
          thinkingLength: fullThinking.length,
          chunkCount,
        });
        
        setProcessingSteps(prev => completeProcessingStep(prev, "response-parse"));
        
        // ステップ8: UI描画
        setProcessingSteps(prev => startProcessingStep(prev, "ui-render"));

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
        
        setProcessingSteps(prev => completeProcessingStep(prev, "ui-render"));
        
        // ステップ9: 完了
        setProcessingSteps(prev => startProcessingStep(prev, "complete"));
        setProcessingSteps(prev => completeProcessingStep(prev, "complete"));

        setStreamState((prev) => ({ ...prev, isComplete: true }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          logger.info(`[${requestId}] Stream aborted by user`);
          return;
        }
        
        // エラー時は現在のステップを失敗に
        setProcessingSteps(prev => {
          const runningStep = prev.find(s => s.status === "running");
          if (runningStep) {
            return failProcessingStep(prev, runningStep.id, errorMessage);
          }
          return prev;
        });
        
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
    processingSteps,

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
