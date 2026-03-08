/**
 * ツール呼び出しグループコンポーネント
 *
 * 同じ種類のツール呼び出しをグループ化して表示
 *
 * @created 2026-02-27
 */

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { useState } from "react";
import type { ToolCallInfo } from "@/hooks/useLLMStream/types";
import { getToolConfig } from "@/lib/tools/config";
import type { Citation } from "./CitationsList";
import { CitationsList } from "./CitationsList";

interface ToolCallGroupProps {
  toolName: string;
  toolCalls: ToolCallInfo[];
  citations: Citation[];
}

export function ToolCallGroup({ toolName, toolCalls, citations }: ToolCallGroupProps) {
  const config = getToolConfig(toolName);
  const [isExpanded, setIsExpanded] = useState(false);

  // 完了したツールと実行中のツールを分離
  const completedCalls = toolCalls.filter((call) => call.status === "completed");
  const runningCalls = toolCalls.filter((call) => call.status === "running");

  // 全体のステータス
  const isComplete = runningCalls.length === 0;
  const totalCount = toolCalls.length;
  const completedCount = completedCalls.length;

  // citationsをフィルタリング（Web検索/X検索で分岐）
  const relatedCitations =
    toolName === "x_search"
      ? citations.filter((c) => c.url.includes("x.com") || c.url.includes("twitter.com"))
      : toolName === "web_search"
        ? citations.filter((c) => !c.url.includes("x.com") && !c.url.includes("twitter.com"))
        : citations;

  const hasCitations = relatedCitations.length > 0;
  const hasQueries = toolCalls.some((call) => call.input);

  return (
    <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm">
      {/* ヘッダー */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
        )}
        <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="font-medium">
          {config.label} {totalCount}ステップ
          {isComplete ? "完了" : `実行中 (${completedCount}/${totalCount})`}
        </span>
        <span className="ml-auto text-blue-600">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200/60 space-y-4">
          {/* 検索クエリ一覧 */}
          {hasQueries && (
            <div>
              <div className="text-xs font-medium text-blue-800/70 mb-2">検索クエリ</div>
              <div className="space-y-1.5">
                {toolCalls.map((call, index) => (
                  <div
                    key={call.id}
                    className="flex items-start gap-2 text-sm text-blue-900 bg-blue-100/50 px-3 py-2 rounded-lg"
                  >
                    {call.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-blue-700/60 text-xs mr-2">{index + 1}.</span>
                      <span className="break-all">{call.input || "クエリを取得中..."}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 参照ソース */}
          {hasCitations && (
            <div>
              <div className="text-xs font-medium text-blue-800/70 mb-2">
                参照ソース ({relatedCitations.length}件)
              </div>
              <CitationsList citations={relatedCitations} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCallGroup;
