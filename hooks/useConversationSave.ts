"use client";

/**
 * useConversationSave
 *
 * FeatureChat で管理していた会話の読み込み・保存処理を抽出したカスタムフック。
 * currentChatId と isLoadingHistory の状態も内包する。
 */

import { useCallback, useState } from "react";
import type { Message } from "@/components/ui/FeatureChat";

/**
 * LLMプロバイダー名をAPI期待形式（アッパースネークケース）に変換
 * 例: "grok-4-1-fast-reasoning" → "GROK_4_1_FAST_REASONING"
 */
function normalizeProvider(provider: string | undefined): string | undefined {
  if (!provider) return undefined;
  // ハイフンをアンダースコアに、小文字を大文字に変換
  return provider.replace(/-/g, "_").toUpperCase();
}

interface UseConversationSaveOptions {
  featureId: string;
  initialChatId?: string;
  selectedProgramId?: string | null;
  onChatCreated?: (chatId: string) => void;
}

export function useConversationSave({
  featureId,
  initialChatId,
  selectedProgramId,
  onChatCreated,
}: UseConversationSaveOptions) {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(initialChatId);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadConversation = useCallback(async (chatId: string): Promise<Message[]> => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/feature?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          return (data.messages as Message[]).map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
      return [];
    } catch (err) {
      console.error("Failed to load conversation:", err);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const saveConversation = useCallback(
    async (updatedMessages: Message[], chatId: string | undefined) => {
      try {
        // 送信データをシリアライズ（Date オブジェクトを文字列に変換、llmProviderを正規化）
        const payload = {
          chatId,
          featureId,
          programId: selectedProgramId ?? undefined,
          messages: updatedMessages.map((m) => ({
            ...m,
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
            llmProvider: normalizeProvider(m.llmProvider),
          })),
        };
        console.log("[saveConversation] Sending payload:", JSON.stringify(payload, null, 2));

        const response = await fetch("/api/chat/feature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          if (!chatId && data.chatId) {
            setCurrentChatId(data.chatId);
            onChatCreated?.(data.chatId);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to save conversation:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
        }
      } catch (err) {
        console.error("Failed to save conversation:", err);
      }
    },
    [featureId, onChatCreated, selectedProgramId],
  );

  return {
    currentChatId,
    setCurrentChatId,
    isLoadingHistory,
    loadConversation,
    saveConversation,
  };
}
