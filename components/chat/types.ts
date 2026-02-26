/**
 * チャットコンポーネント共有型定義
 *
 * @created 2026-02-22 11:50
 */

import type { CitationInfo, SummarizationEvent, ToolCallInfo } from "@/hooks/useLLMStream";
import type { LLMProvider } from "@/lib/llm/types";

// レガシー表示コンポーネント用のローカル型定義
export interface ReasoningStepInfo {
  step: number;
  content: string;
  tokens?: number;
}

export interface ThinkingStepInfo {
  id: string;
  step: number;
  title: string;
  content?: string;
  status: "pending" | "running" | "completed" | "error";
  type: "thinking" | "search" | "analysis" | "synthesis" | "complete";
}

export interface StreamingStepsProps {
  content: string;
  toolCalls: ToolCallInfo[];
  citations: CitationInfo[];
  summarizationEvents: SummarizationEvent[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
  provider: LLMProvider | string;
  isComplete: boolean;
  error?: string | null;
}

export interface ToolCallMessageProps {
  toolCall: ToolCallInfo;
  status: "completed" | "running" | "failed";
  provider: LLMProvider | string;
  citations?: CitationInfo[];
  showHeader?: boolean;
}

export interface ThinkingStepMessageProps {
  step: ReasoningStepInfo;
  provider: LLMProvider | string;
  isActive?: boolean;
  stepNumber?: number;
}

export interface NewThinkingStepMessageProps {
  step: ThinkingStepInfo;
  provider: LLMProvider | string;
  isActive?: boolean;
}

export interface LegacyThinkingMessageProps {
  thinking: string;
  provider: LLMProvider | string;
  isComplete: boolean;
}

export interface ContentMessageProps {
  content: string;
  provider: LLMProvider | string;
  isComplete: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

export interface ErrorMessageProps {
  error: string;
  showHeader?: boolean;
}

export interface ThinkingPlaceholderMessageProps {
  provider: LLMProvider | string;
  showHeader?: boolean;
}

export interface SummarizationMessageProps {
  event: SummarizationEvent;
  provider: LLMProvider | string;
  showHeader?: boolean;
}
