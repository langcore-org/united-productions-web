"use client";

/**
 * useChatInitialization
 *
 * チャットの初期化処理を一元管理するカスタムフック。
 * - 履歴読み込み
 * - ウェルカムメッセージ表示
 * - 初期メッセージの自動送信
 */

import { useEffect, useRef } from "react";
import type { Message } from "@/components/ui/FeatureChat";
import { getWelcomeMessage, hasWelcomeMessage } from "@/lib/chat/welcome-messages";
import { getProgramById } from "@/lib/knowledge/programs";
import type { LLMProvider } from "@/lib/llm/types";

interface UseChatInitializationOptions {
  featureId: string;
  provider: LLMProvider;
  initialChatId?: string;
  initialMessage?: string;
  selectedProgramId: string | null;
  messages: Message[];
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  loadConversation: (chatId: string) => Promise<Message[]>;
  onHistoryLoaded?: (messages: Message[]) => void;
}

export function useChatInitialization({
  featureId,
  provider,
  initialChatId,
  initialMessage,
  selectedProgramId,
  messages,
  setMessages,
  loadConversation,
}: UseChatInitializationOptions): void {
  // 重複実行防止用のref
  const hasShownWelcomeRef = useRef(false);
  const hasSentInitialMessageRef = useRef(false);

  // 1. 履歴読み込み（既存チャットの場合）
  useEffect(() => {
    if (initialChatId) {
      loadConversation(initialChatId).then(setMessages);
    } else {
      setMessages([]);
      hasShownWelcomeRef.current = false;
      hasSentInitialMessageRef.current = false;
    }
  }, [initialChatId, loadConversation, setMessages]);

  // 2. ウェルカムメッセージ表示（新規チャット時のみ）
  useEffect(() => {
    // 既存会話、または既にウェルカムメッセージを表示済みの場合はスキップ
    if (initialChatId || hasShownWelcomeRef.current) return;

    // 初期メッセージがある場合はウェルカムメッセージをスキップ
    if (initialMessage) return;

    // ウェルカムメッセージが定義されていない機能の場合はスキップ
    if (!hasWelcomeMessage(featureId)) return;

    // メッセージが空の場合のみ表示（初回またはクリア後）
    if (messages.length === 0) {
      // 番組名を取得（selectedProgramId が null の場合はデフォルト表示）
      const programInfo = selectedProgramId ? getProgramById(selectedProgramId) : null;
      const programName = programInfo?.name ?? "番組を指定せずにはじめる";

      const welcomeContent = getWelcomeMessage(featureId, programName);

      if (welcomeContent) {
        const welcomeMessage: Message = {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: welcomeContent,
          timestamp: new Date(),
          llmProvider: provider,
        };
        setMessages([welcomeMessage]);
        hasShownWelcomeRef.current = true;
      }
    }
  }, [
    selectedProgramId,
    featureId,
    initialChatId,
    messages.length,
    provider,
    initialMessage,
    setMessages,
  ]);

  // 3. 初期メッセージを自動送信（新規チャット時のみ）
  useEffect(() => {
    // 既存会話、または既に送信済みの場合はスキップ
    if (initialChatId || hasSentInitialMessageRef.current) return;
    if (!initialMessage?.trim()) return;
    if (messages.length > 0) return; // 既にメッセージがある場合はスキップ

    hasSentInitialMessageRef.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: initialMessage.trim(),
      timestamp: new Date(),
    };

    setMessages([userMessage]);
    // 実際の送信はFeatureChatで行う（useEffectの依存関係をシンプルに保つため）
  }, [initialMessage, initialChatId, messages.length, setMessages]);
}

export default useChatInitialization;
