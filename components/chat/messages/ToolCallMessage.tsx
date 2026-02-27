/**
 * ツール呼び出しメッセージコンポーネント
 *
 * @created 2026-02-22 11:50
 * @updated 2026-02-27 クリック展開機能を追加、showHeaderオプションを追加
 */

import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { getToolConfig } from "@/lib/tools/config";
import type { ToolCallMessageProps } from "../types";
import { CitationsList } from "./CitationsList";

export function ToolCallMessage({
  toolCall,
  status,
  provider,
  citations,
  showHeader = true,
}: ToolCallMessageProps) {
  const config = getToolConfig(toolCall.name);
  const Icon = config.icon;
  const [isExpanded, setIsExpanded] = useState(false);

  // ツールに関連するcitationsを抽出（Web検索なら全URL、X検索ならx.com URL）
  const relatedCitations =
    citations?.filter((c) => {
      if (toolCall.name === "x_search" || toolCall.name === "web_search") {
        // X検索: x.com または twitter.com のURL
        if (toolCall.name === "x_search") {
          return c.url.includes("x.com") || c.url.includes("twitter.com");
        }
        // Web検索: x.com/twitter.com 以外のURL
        return !c.url.includes("x.com") && !c.url.includes("twitter.com");
      }
      // その他のツールは全citationsを表示
      return true;
    }) ?? [];

  const hasDetails = toolCall.input || relatedCitations.length > 0;

  const messageContent = (
    <div
      className={`relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm ${
        hasDetails ? "cursor-pointer hover:bg-blue-100/80 transition-colors" : ""
      }`}
      onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (hasDetails && (e.key === "Enter" || e.key === " ")) {
          setIsExpanded(!isExpanded);
        }
      }}
      role={hasDetails ? "button" : undefined}
      tabIndex={hasDetails ? 0 : undefined}
      aria-expanded={hasDetails ? isExpanded : undefined}
    >
      <div className="flex items-center gap-2">
        {status === "running" ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        )}
        <span className="font-medium">{config.label}</span>
        {toolCall.input && !isExpanded && (
          <span className="text-blue-700/70 text-xs truncate max-w-[200px]">{toolCall.input}</span>
        )}
        {hasDetails && (
          <span className="ml-auto text-blue-600">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        )}
      </div>

      {/* 展開時の詳細表示 */}
      {isExpanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-blue-200/60 space-y-3">
          {/* 検索クエリ詳細 */}
          {toolCall.input && (
            <div>
              <div className="text-xs font-medium text-blue-800/70 mb-1">検索クエリ</div>
              <div className="text-sm text-blue-900 bg-blue-100/50 px-3 py-2 rounded-lg break-all">
                {toolCall.input}
              </div>
            </div>
          )}

          {/* 関連citations */}
          {relatedCitations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-800/70 mb-1">
                参照ソース ({relatedCitations.length}件)
              </div>
              <CitationsList citations={relatedCitations} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ヘッダーなし（StreamingSteps内で統一ヘッダーを使用）
  if (!showHeader) {
    return messageContent;
  }

  // ヘッダーあり（単独使用時）
  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">Teddy</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
        </div>
        {messageContent}
      </div>
    </div>
  );
}

export default ToolCallMessage;
