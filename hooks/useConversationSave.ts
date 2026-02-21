'use client';

/**
 * useConversationSave
 *
 * FeatureChat で管理していた会話の読み込み・保存処理を抽出したカスタムフック。
 * currentChatId と isLoadingHistory の状態も内包する。
 */

import { useState, useCallback } from 'react';
import type { Message } from '@/components/ui/FeatureChat';

interface UseConversationSaveOptions {
  featureId: string;
  initialChatId?: string;
  onChatCreated?: (chatId: string) => void;
}

export function useConversationSave({
  featureId,
  initialChatId,
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
      console.error('Failed to load conversation:', err);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const saveConversation = useCallback(
    async (updatedMessages: Message[], chatId: string | undefined) => {
      try {
        const response = await fetch('/api/chat/feature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, featureId, messages: updatedMessages }),
        });
        if (response.ok) {
          const data = await response.json();
          if (!chatId && data.chatId) {
            setCurrentChatId(data.chatId);
            onChatCreated?.(data.chatId);
          }
        }
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    },
    [featureId, onChatCreated],
  );

  return {
    currentChatId,
    setCurrentChatId,
    isLoadingHistory,
    loadConversation,
    saveConversation,
  };
}
