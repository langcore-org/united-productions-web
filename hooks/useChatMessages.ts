"use client";

/**
 * useChatMessages
 *
 * FeatureChatから抽出したメッセージ状態管理フック。
 * メッセージ一覧、入力、ファイル添付、D&D、コピー、サジェスト処理を統合管理する。
 */

import { useCallback, useRef, useState } from "react";
import type { Message } from "@/components/ui/chat-types";
import type { AttachedFile } from "@/components/ui/FileAttachment";
import { MAX_FILE_SIZE_MB } from "@/config/constants";
import { buildDisplayContent, buildLlmContent, processFile } from "@/lib/chat/file-content";
import type { LLMMessage, LLMProvider } from "@/lib/llm/types";

interface UseChatMessagesOptions {
  provider: LLMProvider;
  featureId: string;
  selectedProgramId: string | null;
  enableFileAttachment: boolean;
  isPending: boolean;
  startStream: (
    messages: LLMMessage[],
    provider: LLMProvider,
    featureId?: string,
    programId?: string,
  ) => Promise<void>;
}

export function useChatMessages({
  provider,
  featureId,
  selectedProgramId,
  enableFileAttachment,
  isPending,
  startStream,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const buildStreamMessages = useCallback((userContent: string, history: Message[]): LLMMessage[] => {
    const conversationHistory: LLMMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
    return [...conversationHistory, { role: "user", content: userContent }];
  }, []);

  const handleSend = useCallback(async () => {
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
    setDragError(null);

    const streamMessages = buildStreamMessages(llmContent, messages);
    await startStream(streamMessages, provider, featureId, selectedProgramId ?? undefined);
  }, [
    input,
    attachedFiles,
    messages,
    provider,
    featureId,
    selectedProgramId,
    buildStreamMessages,
    startStream,
  ]);

  const handleCopy = useCallback(async () => {
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [messages]);

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

  // ファイルバリデーション
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
    [attachedFiles, isPending, enableFileAttachment, validateFile],
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
    [handleFiles],
  );

  return {
    messages,
    setMessages,
    input,
    setInput,
    isCopied,
    attachedFiles,
    setAttachedFiles,
    isDragging,
    dragError,
    setDragError,
    buildStreamMessages,
    handleSend,
    handleCopy,
    handleSuggestionClick,
    handleFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
