/**
 * ThinkingProcess コンポーネント
 *
 * エージェント思考プロセス全体のコンテナ
 *
 * @updated 2026-02-20 23:55
 */

"use client";

import { Sparkles } from "lucide-react";
import { TeddyIcon } from "@/components/icons/TeddyIcon";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SearchResultItem, ThinkingEvent, ThinkingStep } from "@/types/agent-thinking";
import { ComputerPanel, ComputerPanelOverlay, ComputerPanelToggle } from "./ComputerPanel";
import { ThinkingStepList } from "./ThinkingStep";

export interface ThinkingProcessProps {
  /** ステップ一覧 */
  steps: ThinkingStep[];
  /** 現在アクティブなステップID */
  activeStepId?: string;
  /** 全体のステータス */
  overallStatus?: "idle" | "running" | "completed" | "error";
  /** ストリーミングイベント（リアルタイム更新用） */
  events?: ThinkingEvent[];
  /** 追加クラス */
  className?: string;
}

/**
 * 思考プロセスコンテナ
 *
 * ステップリストとComputerパネルを統合管理
 */
export function ThinkingProcess({
  steps: initialSteps,
  activeStepId: initialActiveStepId,
  overallStatus = "idle",
  events = [],
  className,
}: ThinkingProcessProps) {
  // ステップ状態
  const [steps, setSteps] = useState<ThinkingStep[]>(initialSteps);
  const [activeStepId, setActiveStepId] = useState<string | undefined>(initialActiveStepId);
  const [activeSubStepId, setActiveSubStepId] = useState<string | undefined>();

  // Computerパネル状態
  const [isComputerOpen, setIsComputerOpen] = useState(false);
  const [computerSearchResults, setComputerSearchResults] = useState<SearchResultItem[]>([]);
  const [computerSearchQuery, setComputerSearchQuery] = useState<string>("");

  // 初期ステップの同期
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  // イベント処理（リアルタイム更新）
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[events.length - 1];

    switch (latestEvent.type) {
      case "step_start":
        setSteps((prev) => [...prev, latestEvent.step]);
        setActiveStepId(latestEvent.step.id);
        break;

      case "step_update":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId ? { ...step, ...latestEvent.updates } : step,
          ),
        );
        break;

      case "step_complete":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId
              ? { ...step, status: "completed", completedAt: latestEvent.completedAt }
              : step,
          ),
        );
        break;

      case "substep_add":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId
              ? { ...step, subSteps: [...step.subSteps, latestEvent.subStep] }
              : step,
          ),
        );
        break;

      case "substep_update":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId
              ? {
                  ...step,
                  subSteps: step.subSteps.map((subStep) =>
                    subStep.id === latestEvent.subStepId
                      ? { ...subStep, ...latestEvent.updates }
                      : subStep,
                  ),
                }
              : step,
          ),
        );
        break;

      case "search_results":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId ? { ...step, searchResults: latestEvent.results } : step,
          ),
        );
        // Computerパネルにも反映
        setComputerSearchResults(latestEvent.results);
        break;

      case "content_append":
        setSteps((prev) =>
          prev.map((step) =>
            step.id === latestEvent.stepId
              ? { ...step, content: (step.content || "") + latestEvent.content }
              : step,
          ),
        );
        break;
    }
  }, [events]);

  // アクティブなサブステップを取得
  const activeSubStep = activeStepId
    ? steps.find((s) => s.id === activeStepId)?.subSteps.find((ss) => ss.id === activeSubStepId)
    : undefined;

  // サブステップクリック時の処理
  const handleSubStepClick = useCallback(
    (subStepId: string) => {
      setActiveSubStepId(subStepId);

      // 検索タイプのサブステップの場合、Computerパネルを開く
      const subStep = steps.flatMap((s) => s.subSteps).find((ss) => ss.id === subStepId);

      if (subStep?.type === "search" && subStep.searchQuery) {
        setComputerSearchQuery(subStep.searchQuery);
        // 関連する検索結果を探す
        const parentStep = steps.find((s) => s.subSteps.some((ss) => ss.id === subStepId));
        if (parentStep?.searchResults) {
          setComputerSearchResults(parentStep.searchResults);
        }
        setIsComputerOpen(true);
      }
    },
    [steps],
  );

  // 進行中のステップがあれば自動的にアクティブにする
  useEffect(() => {
    const runningStep = steps.find((s) => s.status === "running");
    if (runningStep) {
      setActiveStepId(runningStep.id);
    }
  }, [steps]);

  // 完了したステップ数
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;

  // 実行中かどうか
  const isRunning = overallStatus === "running" || steps.some((s) => s.status === "running");

  return (
    <div className={cn("relative", className)}>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        {/* アバター */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
          {isRunning ? (
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          ) : (
            <TeddyIcon size={32} className="rounded-none" />
          )}
        </div>

        {/* タイトル */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Teddy</h3>
          {isRunning && <p className="text-xs text-gray-500">思考中...</p>}
          {!isRunning && completedSteps > 0 && (
            <p className="text-xs text-gray-500">
              {completedSteps}/{totalSteps} ステップ完了
            </p>
          )}
        </div>
      </div>

      {/* ステップリスト */}
      <ThinkingStepList
        steps={steps}
        activeStepId={activeStepId}
        activeSubStepId={activeSubStepId}
        onSubStepClick={handleSubStepClick}
      />

      {/* Computerパネル（デスクトップ） */}
      <ComputerPanel
        isOpen={isComputerOpen}
        onClose={() => setIsComputerOpen(false)}
        activeSubStep={activeSubStep}
        searchResults={computerSearchResults}
        searchQuery={computerSearchQuery}
        className="hidden sm:flex"
      />

      {/* Computerパネル（モバイル - オーバーレイ） */}
      <ComputerPanelOverlay isOpen={isComputerOpen} onClose={() => setIsComputerOpen(false)} />

      {/* Computerパネル（モバイル - 全画面） */}
      <div className="sm:hidden">
        <ComputerPanel
          isOpen={isComputerOpen}
          onClose={() => setIsComputerOpen(false)}
          activeSubStep={activeSubStep}
          searchResults={computerSearchResults}
          searchQuery={computerSearchQuery}
          className="w-full"
        />
      </div>

      {/* Computerパネルトグルボタン */}
      <ComputerPanelToggle
        isOpen={isComputerOpen}
        onClick={() => setIsComputerOpen(true)}
        unreadCount={computerSearchResults.length}
      />
    </div>
  );
}

/**
 * シンプル版思考プロセス（最小構成）
 */
export interface SimpleThinkingProcessProps {
  /** 表示するテキスト */
  text: string;
  /** 完了状態 */
  isComplete?: boolean;
  /** 追加クラス */
  className?: string;
}

export function SimpleThinkingProcess({
  text,
  isComplete = false,
  className,
}: SimpleThinkingProcessProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center flex-shrink-0">
        {isComplete ? (
          <TeddyIcon size={32} className="rounded-none" />
        ) : (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

export default ThinkingProcess;
