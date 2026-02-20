/**
 * AgenticResponse コンポーネント
 * 
 * エージェンティックな回答表示を統合するコンポーネント
 * - ツール実行状態の表示
 * - 思考プロセスの表示
 * - 構造化された回答の表示
 * - 使用状況サマリーの表示
 */

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Twitter,
  Terminal,
  FileSearch,
  BrainCircuit,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bot,
} from "lucide-react";

// ============================================
// 型定義
// ============================================

export interface ToolCallInfo {
  id: string;
  type: string;
  name?: string;
  input?: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface ReasoningStepInfo {
  step: number;
  content: string;
  tokens?: number;
}

export interface ToolUsageInfo {
  web_search_calls?: number;
  x_search_calls?: number;
  code_interpreter_calls?: number;
  file_search_calls?: number;
  mcp_calls?: number;
  document_search_calls?: number;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface AgenticResponseProps {
  /** メインコンテンツ */
  content: string;
  /** 思考プロセス（レガシー） */
  thinking?: string;
  /** ツール呼び出し情報 */
  toolCalls?: ToolCallInfo[];
  /** 思考ステップ */
  reasoningSteps?: ReasoningStepInfo[];
  /** ツール使用状況 */
  toolUsage?: ToolUsageInfo | null;
  /** トークン使用状況 */
  usage?: UsageInfo | null;
  /** 完了状態 */
  isComplete?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** プロバイダー名 */
  provider?: string;
  /** 追加クラス */
  className?: string;
  /** 思考プロセスを表示するか */
  showThinking?: boolean;
  /** ツール使用状況を表示するか */
  showToolUsage?: boolean;
  /** バリアント */
  variant?: "default" | "chat";
}

// ============================================
// ツール設定
// ============================================

const toolConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  web_search: { icon: Search, label: "Web検索", color: "text-blue-500" },
  x_search: { icon: Twitter, label: "X検索", color: "text-sky-500" },
  x_keyword_search: { icon: Twitter, label: "Xキーワード検索", color: "text-sky-500" },
  x_semantic_search: { icon: Twitter, label: "X意味検索", color: "text-sky-500" },
  code_execution: { icon: Terminal, label: "コード実行", color: "text-green-500" },
  code_interpreter: { icon: Terminal, label: "コード実行", color: "text-green-500" },
  collections_search: { icon: FileSearch, label: "ファイル検索", color: "text-purple-500" },
  file_search: { icon: FileSearch, label: "ファイル検索", color: "text-purple-500" },
  custom_tool: { icon: BrainCircuit, label: "ツール実行", color: "text-orange-500" },
};

// ============================================
// サブコンポーネント
// ============================================

/**
 * ツール呼び出しインジケーター
 */
function ToolCallIndicator({ toolCalls }: { toolCalls: ToolCallInfo[] }) {
  if (toolCalls.length === 0) return null;

  // 重複を除去して最新のステータスを保持
  const uniqueCalls = useMemo(() => {
    const callMap = new Map<string, ToolCallInfo>();
    toolCalls.forEach((call) => {
      callMap.set(call.id, call);
    });
    return Array.from(callMap.values());
  }, [toolCalls]);

  const runningCount = uniqueCalls.filter((c) => c.status === "running").length;
  const completedCount = uniqueCalls.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-2 mb-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <BrainCircuit className="w-3 h-3" />
        <span>ツール実行</span>
        {runningCount > 0 && (
          <span className="text-blue-500">({runningCount} 実行中)</span>
        )}
        {completedCount > 0 && runningCount === 0 && (
          <span className="text-green-500">({completedCount} 完了)</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueCalls.map((tool) => {
          const config = toolConfig[tool.type] || toolConfig[tool.name || ""] || {
            icon: BrainCircuit,
            label: tool.name || tool.type,
            color: "text-gray-500",
          };
          const Icon = config.icon;

          return (
            <div
              key={tool.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                tool.status === "running" && "bg-blue-50 text-blue-700 border-blue-200 animate-pulse",
                tool.status === "completed" && "bg-green-50 text-green-700 border-green-200",
                tool.status === "failed" && "bg-red-50 text-red-700 border-red-200",
                tool.status === "pending" && "bg-gray-50 text-gray-600 border-gray-200"
              )}
            >
              <Icon className={cn("w-3 h-3", config.color)} />
              <span>{config.label}</span>
              {tool.status === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
              {tool.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
              {tool.status === "failed" && <XCircle className="w-3 h-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 思考ステップ表示
 */
function ReasoningSteps({ steps, totalTokens }: { steps: ReasoningStepInfo[]; totalTokens?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (steps.length === 0) return null;

  const latestStep = steps[steps.length - 1];

  return (
    <div className="mb-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2.5 text-left hover:bg-purple-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">思考プロセス</span>
          {totalTokens && totalTokens > 0 && (
            <span className="text-xs text-purple-600">({totalTokens.toLocaleString()} トークン)</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-2 p-2 rounded bg-white/60 border border-purple-100/50"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-xs font-medium text-purple-700">
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{step.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isExpanded && latestStep && (
        <div className="px-3 pb-3">
          <p className="text-sm text-gray-600 line-clamp-2">{latestStep.content}</p>
        </div>
      )}
    </div>
  );
}

/**
 * ツール使用サマリー
 */
function ToolUsageSummary({ toolUsage }: { toolUsage: ToolUsageInfo | null }) {
  if (!toolUsage) return null;

  const items = [
    { key: "web_search_calls", label: "Web検索", count: toolUsage.web_search_calls, icon: Search },
    { key: "x_search_calls", label: "X検索", count: toolUsage.x_search_calls, icon: Twitter },
    { key: "code_interpreter_calls", label: "コード実行", count: toolUsage.code_interpreter_calls, icon: Terminal },
    { key: "file_search_calls", label: "ファイル検索", count: toolUsage.file_search_calls, icon: FileSearch },
  ].filter((item) => item.count && item.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
      {items.map(({ key, label, count, icon: Icon }) => (
        <div key={key} className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span>
            {label}: {count}回
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 使用状況表示
 */
function UsageInfo({ usage, toolUsage }: { usage: UsageInfo | null; toolUsage: ToolUsageInfo | null }) {
  if (!usage && !toolUsage) return null;

  return (
    <div className="mt-2 space-y-1">
      {usage && (
        <div className="text-xs text-gray-400">
          {usage.inputTokens.toLocaleString()} 入力 / {usage.outputTokens.toLocaleString()} 出力
          {" "}• ${usage.cost.toFixed(6)}
        </div>
      )}
      <ToolUsageSummary toolUsage={toolUsage} />
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

export function AgenticResponse({
  content,
  thinking,
  toolCalls = [],
  reasoningSteps = [],
  toolUsage = null,
  usage = null,
  isComplete = false,
  error = null,
  provider,
  className,
  showThinking = true,
  showToolUsage = true,
  variant = "default",
}: AgenticResponseProps) {
  const hasToolCalls = toolCalls.length > 0;
  const hasReasoning = reasoningSteps.length > 0;
  const hasThinking = thinking && thinking.length > 0;
  const isStreaming = !isComplete && (content || hasToolCalls || hasReasoning);

  // チャット風バリアント
  if (variant === "chat") {
    return (
      <div className={cn("flex gap-4", className)}>
        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
          {isComplete ? (
            <Bot className="w-4 h-4 text-white" />
          ) : (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-[85%] items-start">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-medium text-gray-600">AI Assistant</span>
            {provider && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {provider}
              </span>
            )}
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                生成中
              </span>
            )}
          </div>

          {/* Tool Calls */}
          {hasToolCalls && <ToolCallIndicator toolCalls={toolCalls} />}

          {/* Reasoning Steps */}
          {showThinking && hasReasoning && (
            <ReasoningSteps steps={reasoningSteps} totalTokens={usage?.inputTokens} />
          )}

          {/* Legacy Thinking */}
          {showThinking && hasThinking && !hasReasoning && (
            <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">思考プロセス</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{thinking}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">エラーが発生しました</span>
              </div>
              <p className="text-red-600/80">{error}</p>
            </div>
          )}

          {/* Message Content */}
          <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
            {content ? (
              <div className="whitespace-pre-wrap">
                {content}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
                )}
              </div>
            ) : (
              !isComplete && (
                <div className="flex items-center gap-3 text-gray-400 py-1">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs">考え中...</span>
                </div>
              )
            )}
          </div>

          {/* Usage Info */}
          {showToolUsage && isComplete && <UsageInfo usage={usage} toolUsage={toolUsage} />}
        </div>
      </div>
    );
  }

  // デフォルトバリアント
  return (
    <div className={cn("space-y-3", className)}>
      {/* ツール呼び出し */}
      {hasToolCalls && <ToolCallIndicator toolCalls={toolCalls} />}

      {/* 思考ステップ */}
      {hasReasoning && showThinking && (
        <ReasoningSteps steps={reasoningSteps} totalTokens={usage?.inputTokens} />
      )}

      {/* 思考プロセス（レガシー） */}
      {hasThinking && showThinking && !hasReasoning && (
        <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">思考プロセス</div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{thinking}</div>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">エラーが発生しました</span>
          </div>
          <p className="text-red-600/80">{error}</p>
        </div>
      )}

      {/* メッセージコンテンツ */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
          {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-foreground/50 animate-pulse" />}
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isStreaming ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>生成中...</span>
            {provider && <span className="text-muted-foreground/60">• {provider}</span>}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span className="text-green-600">完了</span>
          </>
        )}
      </div>

      {/* ツール使用状況 */}
      {showToolUsage && isComplete && <UsageInfo usage={usage} toolUsage={toolUsage} />}
    </div>
  );
}

export default AgenticResponse;
