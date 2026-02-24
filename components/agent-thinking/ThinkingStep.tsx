/**
 * ThinkingStep コンポーネント
 *
 * 個別の思考ステップを表示（折りたたみ対応）
 *
 * @updated 2026-02-20 23:40
 */

"use client";

import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Loader2,
  Monitor,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { cn } from "@/lib/utils";
import type { ThinkingStep as ThinkingStepType } from "@/types/agent-thinking";
import { SubStepList } from "./SubStep";

// アイコンマッピング
const iconMap = {
  thinking: BrainCircuit,
  search: Search,
  analysis: BrainCircuit,
  synthesis: FileCheck,
  complete: CheckCircle2,
};

// ステータスアイコン
const statusIconMap = {
  running: Loader2,
  completed: CheckCircle2,
  error: XCircle,
};

// ステータススタイル
const statusStyles = {
  running: "text-blue-500",
  completed: "text-green-500",
  error: "text-red-500",
};

// ステップタイプラベル
const _typeLabels: Record<ThinkingStepType["type"], string> = {
  thinking: "思考",
  search: "検索",
  analysis: "分析",
  synthesis: "統合",
  complete: "完了",
};

export interface ThinkingStepProps {
  step: ThinkingStepType;
  /** デフォルトで展開するか */
  defaultExpanded?: boolean;
  /** アクティブなサブステップID */
  activeSubStepId?: string;
  /** サブステップクリック時のコールバック */
  onSubStepClick?: (subStepId: string) => void;
  /** 追加クラス */
  className?: string;
}

/**
 * 思考ステップコンポーネント
 *
 * 親ステップのタイトル、説明、サブステップを折りたたみ可能な形式で表示
 */
export function ThinkingStep({
  step,
  defaultExpanded = false,
  activeSubStepId,
  onSubStepClick,
  className,
}: ThinkingStepProps) {
  // 進行中は展開、完了は折りたたみ（デフォルト動作）
  const shouldExpandByDefault = step.status === "running" || defaultExpanded;
  const [isExpanded, setIsExpanded] = useState(shouldExpandByDefault);

  // ステータス変更時に自動的に展開/折りたたみ
  useEffect(() => {
    if (step.status === "running") {
      setIsExpanded(true);
    }
  }, [step.status]);

  const Icon = iconMap[step.type] || BrainCircuit;
  const StatusIcon = statusIconMap[step.status];
  const statusStyle = statusStyles[step.status];

  // タイピングアニメーション
  const {
    displayText,
    isComplete: isTypingComplete,
    start,
  } = useTypingAnimation({
    typingSpeed: 20,
    autoStart: false,
  });

  // コンテンツが変更されたらタイピング開始
  useEffect(() => {
    if (step.content && isExpanded) {
      start(step.content);
    }
  }, [step.content, isExpanded, start]);

  const hasSubSteps = step.subSteps.length > 0;
  const hasContent = step.content && step.content.length > 0;
  const hasSearchResults = step.searchResults && step.searchResults.length > 0;

  // 進捗表示
  const progressText = step.progress ? `${step.progress.current}/${step.progress.total}` : null;

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        "bg-white border-gray-200",
        step.status === "running" && "border-blue-200 ring-1 ring-blue-100",
        step.status === "completed" && "border-gray-200",
        step.status === "error" && "border-red-200 ring-1 ring-red-100",
        className,
      )}
    >
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          "hover:bg-gray-50 transition-colors",
          "rounded-xl",
          !isExpanded && "rounded-b-xl",
        )}
      >
        {/* ステータスアイコン */}
        <div className="flex-shrink-0">
          <StatusIcon
            className={cn("w-5 h-5", statusStyle, step.status === "running" && "animate-spin")}
          />
        </div>

        {/* アイコン */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>

        {/* タイトル */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{step.title}</h3>
        </div>

        {/* メタデータ */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Knowledge recalled 等のバッジ */}
          {step.metadata?.knowledgeCount !== undefined && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Knowledge recalled({step.metadata.knowledgeCount})
            </span>
          )}

          {/* ツール名 */}
          {step.metadata?.toolName && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              {step.metadata.toolName}
            </span>
          )}

          {/* 進捗 */}
          {progressText && <span className="text-xs text-gray-400">{progressText}</span>}

          {/* タイムスタンプ */}
          {step.completedAt && (
            <span className="text-xs text-gray-400">
              {step.completedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          {/* 展開インジケーター */}
          {(hasSubSteps || hasContent) && (
            <div className="text-gray-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </button>

      {/* 展開時のコンテンツ */}
      {isExpanded && (hasSubSteps || hasContent) && (
        <div className="px-4 pb-4 pt-0">
          {/* 説明文（タイピングアニメーション付き） */}
          {hasContent && (
            <div className="mb-4 pl-10">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {displayText}
                {!isTypingComplete && (
                  <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm" />
                )}
              </p>
            </div>
          )}

          {/* サブステップリスト */}
          {hasSubSteps && (
            <div className="pl-10 space-y-2">
              <SubStepList
                subSteps={step.subSteps}
                activeSubStepId={activeSubStepId}
                onSubStepClick={(subStep) => onSubStepClick?.(subStep.id)}
              />
            </div>
          )}

          {/* 検索結果プレビュー */}
          {hasSearchResults && step.searchResults && (
            <div className="pl-10 mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">検索結果: {step.searchResults.length}件</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ステップリストコンポーネント
 */
export interface ThinkingStepListProps {
  steps: ThinkingStepType[];
  /** アクティブなステップID */
  activeStepId?: string;
  /** アクティブなサブステップID */
  activeSubStepId?: string;
  /** サブステップクリック時のコールバック */
  onSubStepClick?: (subStepId: string) => void;
  /** 追加クラス */
  className?: string;
}

export function ThinkingStepList({
  steps,
  activeStepId,
  activeSubStepId,
  onSubStepClick,
  className,
}: ThinkingStepListProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step) => (
        <ThinkingStep
          key={step.id}
          step={step}
          defaultExpanded={step.id === activeStepId}
          activeSubStepId={activeSubStepId}
          onSubStepClick={onSubStepClick}
        />
      ))}
    </div>
  );
}

export default ThinkingStep;
