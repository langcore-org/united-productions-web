/**
 * チャットコンポーネント共有型定義
 * 
 * @created 2026-02-22 11:50
 */

import type { LLMProvider } from "@/lib/llm/types";
import type { ToolCallInfo, ReasoningStepInfo, ThinkingStepInfo } from "@/hooks/useLLMStream";

export interface StreamingStepsProps {
  content: string;
  thinking: string;
  toolCalls: ToolCallInfo[];
  reasoningSteps: ReasoningStepInfo[];
  thinkingSteps: ThinkingStepInfo[];
  isAccepted: boolean;
  toolUsage: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  } | null;
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
  toolUsage: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  } | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

export interface ErrorMessageProps {
  error: string;
}

export interface ThinkingPlaceholderMessageProps {
  provider: LLMProvider | string;
}
