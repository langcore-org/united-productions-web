/**
 * チャットUI共通型定義
 *
 * FeatureChat, ChatHeader, useChatMessages, useConversationSave, useChatInitialization で共有
 */

import type { LLMProvider } from "@/lib/llm/types";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  toolCalls?: Array<{
    id: string;
    name: string;
    displayName: string;
    status: "running" | "completed";
    input?: string;
  }>;
  citations?: Array<{ url: string; title: string }>;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
}
