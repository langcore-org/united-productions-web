"use client";

/**
 * useThinkingSteps
 *
 * FeatureChat で管理していた ThinkingStep 生成ロジックを抽出したカスタムフック。
 * ツール呼び出しを受け取り、ThinkingProcess コンポーネントに渡す状態を返す。
 */

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ToolCallInfo } from "@/hooks/useLLMStream/types";
import type { ThinkingEvent, ThinkingStep } from "@/types/agent-thinking";

interface UseThinkingStepsOptions {
  toolCalls: ToolCallInfo[];
  isComplete: boolean;
  content: string;
}

export function useThinkingSteps({ toolCalls, isComplete, content }: UseThinkingStepsOptions) {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [thinkingEvents, setThinkingEvents] = useState<ThinkingEvent[]>([]);
  const [activeThinkingStepId, setActiveThinkingStepId] = useState<string | undefined>();

  const getToolCallTitle = useCallback((name: string): string => {
    const titleMap: Record<string, string> = {
      web_search: "Web検索",
      x_search: "X検索",
      code_execution: "コード実行",
      file_search: "ファイル検索",
    };
    return titleMap[name] ?? name ?? "ツール実行";
  }, []);

  const getToolCallLabel = useCallback((name: string): string => {
    const labelMap: Record<string, string> = {
      web_search: "検索",
      x_search: "X検索",
      code_execution: "コード実行",
      file_search: "ファイル検索",
    };
    return labelMap[name] ?? "ツール";
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
                  status: latestToolCall.status,
                }
              : ss,
          ),
        };
        return updated;
      }

      const newStep: ThinkingStep = {
        id: uuidv4(),
        stepNumber: prev.length + 1,
        type: latestToolCall.name === "web_search" ? "search" : "thinking",
        title: getToolCallTitle(latestToolCall.name),
        status: latestToolCall.status === "completed" ? "completed" : "running",
        subSteps: [
          {
            id: latestToolCall.id,
            type: latestToolCall.name === "web_search" ? "search" : "tool_use",
            label: getToolCallLabel(latestToolCall.name),
            searchQuery: latestToolCall.input,
            toolName: latestToolCall.name,
            status: latestToolCall.status,
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

  // ストリーミング開始直前（全状態がリセットされた瞬間）に思考ステップをクリア
  useEffect(() => {
    if (!isComplete && toolCalls.length === 0 && content === "") {
      setThinkingSteps([]);
      setThinkingEvents([]);
      setActiveThinkingStepId(undefined);
    }
  }, [isComplete, content, toolCalls.length]);

  return { thinkingSteps, thinkingEvents, activeThinkingStepId };
}
