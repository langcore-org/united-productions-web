"use client";

import { useState, useEffect } from "react";
import { 
  Send, 
  Server, 
  Brain, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  XCircle,
  Clock,
  Zap,
  Database,
  ArrowRight
} from "lucide-react";

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
  details?: string;
}

export interface ProcessingFlowState {
  steps: ProcessingStep[];
  currentStepId?: string;
  totalDuration?: number;
}

interface ProcessingFlowProps {
  steps: ProcessingStep[];
  className?: string;
}

const stepIcons: Record<string, React.ElementType> = {
  "user-input": Send,
  "request-prepare": Clock,
  "api-request": Server,
  "llm-processing": Brain,
  "tool-execution": Search,
  "streaming": Zap,
  "response-parse": Database,
  "ui-render": MessageSquare,
  "complete": CheckCircle2,
};

interface StepItemProps {
  step: ProcessingStep;
  isLast: boolean;
}

function StepItem({ step, isLast }: StepItemProps) {
  const Icon = stepIcons[step.id] || Loader2;
  const duration = step.endTime && step.startTime 
    ? `${(step.endTime - step.startTime).toFixed(0)}ms` 
    : step.startTime 
      ? "進行中..." 
      : "";

  return (
    <div className="flex items-start gap-3">
      {/* Icon & Connector */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
          step.status === "pending" && "bg-gray-100 border-gray-300 text-gray-400",
          step.status === "running" && "bg-blue-50 border-blue-500 text-blue-600 animate-pulse",
          step.status === "completed" && "bg-green-50 border-green-500 text-green-600",
          step.status === "failed" && "bg-red-50 border-red-500 text-red-600"
        )}>
          {step.status === "running" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : step.status === "completed" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : step.status === "failed" ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-8 mt-1",
            step.status === "completed" ? "bg-green-300" : "bg-gray-200"
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm font-medium",
            step.status === "running" && "text-blue-700",
            step.status === "completed" && "text-green-700",
            step.status === "failed" && "text-red-700",
            step.status === "pending" && "text-gray-500"
          )}>
            {step.label}
          </span>
          {duration && (
            <span className="text-xs text-gray-500">{duration}</span>
          )}
        </div>
        {step.details && (
          <p className="text-xs text-gray-500 mt-1">{step.details}</p>
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

export function ProcessingFlow({ steps, className = "" }: ProcessingFlowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const completedSteps = steps.filter(s => s.status === "completed").length;
  const runningStep = steps.find(s => s.status === "running");

  if (steps.length === 0) return null;

  return (
    <div className={cn("rounded-lg bg-gray-50 border border-gray-200", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {runningStep ? (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {runningStep ? `処理中: ${runningStep.label}` : "処理完了"}
          </span>
          <span className="text-xs text-gray-500">
            ({completedSteps}/{steps.length})
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {isExpanded ? "折りたたむ" : "展開"}
        </span>
      </button>

      {/* Steps */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {steps.map((step, index) => (
            <StepItem 
              key={step.id} 
              step={step} 
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 処理ステップの定義
export const defaultProcessingSteps: ProcessingStep[] = [
  { id: "user-input", label: "ユーザー入力を受信", status: "pending" },
  { id: "request-prepare", label: "リクエストを準備", status: "pending" },
  { id: "api-request", label: "APIリクエストを送信", status: "pending" },
  { id: "llm-processing", label: "LLMが処理中", status: "pending" },
  { id: "tool-execution", label: "ツールを実行", status: "pending" },
  { id: "streaming", label: "ストリーミング受信中", status: "pending" },
  { id: "response-parse", label: "レスポンスを解析", status: "pending" },
  { id: "ui-render", label: "UIを描画", status: "pending" },
  { id: "complete", label: "完了", status: "pending" },
];

// ステップ更新ヘルパー
export function updateProcessingStep(
  steps: ProcessingStep[],
  stepId: string,
  updates: Partial<ProcessingStep>
): ProcessingStep[] {
  return steps.map(step =>
    step.id === stepId
      ? { ...step, ...updates }
      : step
  );
}

export function startProcessingStep(
  steps: ProcessingStep[],
  stepId: string
): ProcessingStep[] {
  return steps.map(step =>
    step.id === stepId
      ? { ...step, status: "running", startTime: Date.now() }
      : step.status === "running"
        ? { ...step, status: "completed", endTime: Date.now() }
        : step
  );
}

export function completeProcessingStep(
  steps: ProcessingStep[],
  stepId: string
): ProcessingStep[] {
  return steps.map(step =>
    step.id === stepId
      ? { ...step, status: "completed", endTime: Date.now() }
      : step
  );
}

export function failProcessingStep(
  steps: ProcessingStep[],
  stepId: string,
  details?: string
): ProcessingStep[] {
  return steps.map(step =>
    step.id === stepId
      ? { ...step, status: "failed", endTime: Date.now(), details }
      : step
  );
}
