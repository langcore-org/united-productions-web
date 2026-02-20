/**
 * SubStep コンポーネント
 * 
 * 検索クエリ、ツール呼び出し等のサブステップを表示
 * 
 * @updated 2026-02-20 23:30
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  FileEdit,
  BookOpen,
  Wrench,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import type { SubStep as SubStepType } from "@/types/agent-thinking";

// アイコンマッピング
const iconMap = {
  search: Search,
  tool_use: Wrench,
  knowledge: BookOpen,
  file_edit: FileEdit,
  read: Eye,
};

// ステータスアイコン
const statusIconMap = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  error: XCircle,
};

// ステータススタイル
const statusStyles = {
  pending: "text-gray-400",
  running: "text-blue-500 animate-spin",
  completed: "text-green-500",
  error: "text-red-500",
};

// ラベルマッピング
const typeLabels: Record<SubStepType["type"], string> = {
  search: "検索",
  tool_use: "ツール",
  knowledge: "ナレッジ",
  file_edit: "編集",
  read: "閲覧",
};

export interface SubStepProps {
  subStep: SubStepType;
  /** クリック時のコールバック */
  onClick?: (subStep: SubStepType) => void;
  /** 選択状態 */
  isActive?: boolean;
  /** 追加クラス */
  className?: string;
}

/**
 * サブステップコンポーネント
 * 
 * 検索クエリやツール呼び出しを表示する小さなバッジ/カード
 */
export function SubStep({
  subStep,
  onClick,
  isActive = false,
  className,
}: SubStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = iconMap[subStep.type] || Wrench;
  const StatusIcon = statusIconMap[subStep.status];
  const statusStyle = statusStyles[subStep.status];

  const hasDetail = subStep.detail && subStep.detail.length > 0;
  const isClickable = !!onClick || hasDetail;

  return (
    <div
      className={cn(
        "group rounded-lg border transition-all duration-200",
        "bg-gray-50 border-gray-200",
        isActive && "bg-blue-50 border-blue-200 ring-1 ring-blue-200",
        isClickable && "cursor-pointer hover:border-gray-300 hover:bg-gray-100",
        className
      )}
    >
      {/* メイン行 */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        onClick={() => {
          if (hasDetail) {
            setIsExpanded(!isExpanded);
          }
          onClick?.(subStep);
        }}
      >
        {/* アイコン */}
        <div className="flex-shrink-0">
          <Icon className={cn("w-4 h-4", statusStyle)} />
        </div>

        {/* ラベル */}
        <span className="flex-shrink-0 text-xs font-medium text-gray-600">
          {subStep.label}
        </span>

        {/* 検索クエリ（ある場合） */}
        {subStep.searchQuery && (
          <span className="flex-1 min-w-0 text-xs text-gray-500 truncate">
            {subStep.searchQuery}
          </span>
        )}

        {/* ツール名（ある場合） */}
        {subStep.toolName && (
          <span className="flex-1 min-w-0 text-xs text-gray-500 truncate">
            {subStep.toolName}
          </span>
        )}

        {/* ステータスアイコン */}
        <StatusIcon
          className={cn(
            "w-4 h-4 flex-shrink-0",
            statusStyle,
            subStep.status === "running" && "animate-spin"
          )}
        />

        {/* 展開インジケーター */}
        {hasDetail && (
          <div className="flex-shrink-0 text-gray-400">
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </div>
        )}
      </div>

      {/* 詳細展開 */}
      {isExpanded && hasDetail && (
        <div className="px-3 pb-3 pt-0">
          <div className="pl-6 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
            {subStep.detail}
          </div>
          
          {/* メタデータ */}
          {subStep.metadata && (
            <div className="pl-6 mt-2 flex flex-wrap gap-2">
              {subStep.metadata.resultCount !== undefined && (
                <span className="text-xs text-gray-400">
                  結果: {subStep.metadata.resultCount}件
                </span>
              )}
              {subStep.metadata.duration !== undefined && (
                <span className="text-xs text-gray-400">
                  時間: {subStep.metadata.duration.toFixed(2)}s
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * サブステップリストコンポーネント
 */
export interface SubStepListProps {
  subSteps: SubStepType[];
  /** アクティブなサブステップID */
  activeSubStepId?: string;
  /** クリック時のコールバック */
  onSubStepClick?: (subStep: SubStepType) => void;
  /** 追加クラス */
  className?: string;
}

export function SubStepList({
  subSteps,
  activeSubStepId,
  onSubStepClick,
  className,
}: SubStepListProps) {
  if (subSteps.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {subSteps.map((subStep) => (
        <SubStep
          key={subStep.id}
          subStep={subStep}
          isActive={subStep.id === activeSubStepId}
          onClick={onSubStepClick}
        />
      ))}
    </div>
  );
}

export default SubStep;
