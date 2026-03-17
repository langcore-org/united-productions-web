/**
 * ツール呼び出しグループコンポーネント
 *
 * 同じ種類のツール呼び出しをグループ化して表示
 *
 * @created 2026-02-27
 */

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { useState } from "react";
import type { CitationInfo, ToolCallInfo } from "@/hooks/useLLMStream/types";
import { getToolConfig } from "@/lib/tools/config";

import { SearchResultsCard } from "./SearchResultsCard";

const LONG_QUERY_THRESHOLD = 50;

function QueryItem({ call, index }: { call: ToolCallInfo; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = (call.input?.length ?? 0) > LONG_QUERY_THRESHOLD;

  return (
    <div className="text-xs text-blue-900 bg-blue-100/50 rounded overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1">
        {call.status === "running" ? (
          <Loader2 className="w-3 h-3 animate-spin text-blue-600 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
        )}
        <span className="flex-shrink-0 text-blue-700/50">{index + 1}.</span>
        <span className="flex-1 min-w-0 truncate">{call.input || "クエリを取得中..."}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 text-blue-600/50 hover:text-blue-600 transition-colors"
            aria-label={isExpanded ? "折りたたむ" : "展開する"}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="mx-2 mb-1.5 px-2 py-1.5 bg-blue-100 rounded text-blue-900/80 break-all leading-relaxed">
          {call.input}
        </div>
      )}
    </div>
  );
}

interface ToolCallGroupProps {
  toolName: string;
  toolCalls: ToolCallInfo[];
  citations: CitationInfo[];
  defaultExpanded?: boolean;
}

export function ToolCallGroup({
  toolName,
  toolCalls,
  citations,
  defaultExpanded = false,
}: ToolCallGroupProps) {
  const config = getToolConfig(toolName);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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

  // ヘッダー用の要約情報
  const queryInputs = toolCalls
    .map((call) => call.input)
    .filter((input): input is string => !!input);
  const firstQuery = queryInputs[0];
  const extraQueryCount = queryInputs.length > 1 ? queryInputs.length - 1 : 0;

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
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-medium">
            {config.label} {totalCount}ステップ
            {isComplete ? "完了" : `実行中 (${completedCount}/${totalCount})`}
            {hasCitations && ` · ${relatedCitations.length}サイト`}
          </span>
          {(firstQuery || extraQueryCount > 0) && (
            <span className="text-xs text-blue-800/80 line-clamp-1">
              {firstQuery}
              {extraQueryCount > 0 && ` +${extraQueryCount}`}
            </span>
          )}
        </div>
        <span className="ml-auto text-blue-600">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-blue-200/60 space-y-2">
          {/* 検索クエリ一覧 */}
          {hasQueries && (
            <div>
              <div className="text-[11px] font-medium text-blue-800/70 mb-1">検索クエリ</div>
              <div className="space-y-0.5">
                {toolCalls.map((call, index) => (
                  <QueryItem key={call.id} call={call} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* 検索結果一覧 */}
          {hasCitations && (
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-blue-800/70">検索結果一覧</div>
              <SearchResultsCard citations={relatedCitations} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCallGroup;
