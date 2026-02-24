"use client";

/**
 * useThinkingSteps
 *
 * FeatureChat で管理していた ThinkingStep 生成ロジックを抽出したカスタムフック。
 * ツール呼び出し・thinking テキスト・reasoningSteps を受け取り、
 * ThinkingProcess コンポーネントに渡す状態を返す。
 */

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ReasoningStepInfo, ToolCallInfo } from "@/hooks/useLLMStream/types";
import type { ThinkingEvent, ThinkingStep } from "@/types/agent-thinking";

interface UseThinkingStepsOptions {
  toolCalls: ToolCallInfo[];
  thinking: string;
  reasoningSteps: ReasoningStepInfo[];
  isComplete: boolean;
  content: string;
}

export function useThinkingSteps({
  toolCalls,
  thinking,
  reasoningSteps,
  isComplete,
  content,
}: UseThinkingStepsOptions) {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [thinkingEvents, setThinkingEvents] = useState<ThinkingEvent[]>([]);
  const [activeThinkingStepId, setActiveThinkingStepId] = useState<string | undefined>();

  const getToolCallTitle = useCallback((type: string, name?: string): string => {
    const titleMap: Record<string, string> = {
      web_search: "Web検索",
      x_search: "X検索",
      code_execution: "コード実行",
      file_search: "ファイル検索",
    };
    return titleMap[type] ?? name ?? "ツール実行";
  }, []);

  const getToolCallLabel = useCallback((type: string): string => {
    const labelMap: Record<string, string> = {
      web_search: "検索",
      x_search: "X検索",
      code_execution: "コード実行",
      file_search: "ファイル検索",
    };
    return labelMap[type] ?? "ツール";
  }, []);

  // ツール呼び出しを思考ステップに変換
  useEffect(() => {
    if (toolCalls.length === 0) return;

    const latestToolCall = toolCalls[toolCalls.length - 1];

    setThinkingSteps((prev) => {
      const existingIndex = prev.findIndex((s) => s.metadata?.toolId === latestToolCall.id);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: latestToolCall.status === "completed" ? "completed" : "running",
          subSteps: updated[existingIndex].subSteps.map((ss) =>
            ss.id === latestToolCall.id
              ? {
                  ...ss,
                  status: latestToolCall.status === "failed" ? "error" : latestToolCall.status,
                }
              : ss,
          ),
        };
        return updated;
      }

      const newStep: ThinkingStep = {
        id: uuidv4(),
        stepNumber: prev.length + 1,
        type: latestToolCall.type === "web_search" ? "search" : "thinking",
        title: getToolCallTitle(latestToolCall.type, latestToolCall.name),
        status: latestToolCall.status === "completed" ? "completed" : "running",
        subSteps: [
          {
            id: latestToolCall.id,
            type: latestToolCall.type === "web_search" ? "search" : "tool_use",
            label: getToolCallLabel(latestToolCall.type),
            searchQuery: latestToolCall.input,
            toolName: latestToolCall.name,
            status: latestToolCall.status === "failed" ? "error" : latestToolCall.status,
            timestamp: new Date(),
          },
        ],
        metadata: {
          toolId: latestToolCall.id,
          toolName: latestToolCall.name,
        },
        timestamp: new Date(),
      };

      return [...prev, newStep];
    });

    if (latestToolCall.status === "running") {
      setActiveThinkingStepId(latestToolCall.id);
    }
  }, [toolCalls, getToolCallTitle, getToolCallLabel]);

  // thinking / reasoningSteps から思考ステップを生成
  useEffect(() => {
    const currentlyStreaming = !isComplete && (content || thinking);
    if (!currentlyStreaming) return;

    if (thinking && thinking.length > 0) {
      if (thinkingSteps.length === 0) {
        const newStep: ThinkingStep = {
          id: uuidv4(),
          stepNumber: 1,
          type: "thinking",
          title: "思考中...",
          content: thinking,
          status: "running",
          subSteps: [],
          timestamp: new Date(),
        };
        setThinkingSteps([newStep]);
        setActiveThinkingStepId(newStep.id);
      } else {
        setThinkingSteps((prev) =>
          prev.map((step, i) =>
            i === prev.length - 1 && step.type === "thinking"
              ? { ...step, content: thinking }
              : step,
          ),
        );
      }
    }

    if (reasoningSteps.length > 0 && thinkingSteps.length === 0) {
      const steps: ThinkingStep[] = reasoningSteps.map((rs, index) => ({
        id: uuidv4(),
        stepNumber: index + 1,
        type: index === reasoningSteps.length - 1 ? "thinking" : "analysis",
        title: `ステップ ${rs.step}`,
        content: rs.content,
        status: index === reasoningSteps.length - 1 ? "running" : "completed",
        subSteps: [],
        timestamp: new Date(),
      }));
      setThinkingSteps(steps);
      if (steps.length > 0) {
        setActiveThinkingStepId(steps[steps.length - 1].id);
      }
    }
  }, [isComplete, content, thinking, reasoningSteps, thinkingSteps.length]);

  // ストリーミング開始直前（全状態がリセットされた瞬間）に思考ステップをクリア
  useEffect(() => {
    const currentlyStreaming = !isComplete && (content || thinking);
    if (
      !isComplete &&
      !currentlyStreaming &&
      toolCalls.length === 0 &&
      content === "" &&
      thinking === ""
    ) {
      setThinkingSteps([]);
      setThinkingEvents([]);
      setActiveThinkingStepId(undefined);
    }
  }, [isComplete, content, thinking, toolCalls.length]);

  return { thinkingSteps, thinkingEvents, activeThinkingStepId };
}
