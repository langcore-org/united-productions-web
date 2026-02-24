/**
 * ツール使用サマリーコンポーネント
 *
 * @created 2026-02-23
 */

import { getToolConfig } from "@/lib/tools/config";

export interface ToolUsageSummaryProps {
  toolUsage: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  } | null;
}

export function ToolUsageSummary({ toolUsage }: ToolUsageSummaryProps) {
  if (!toolUsage) return null;

  const items = [
    {
      key: "web_search_calls",
      ...getToolConfig("web_search"),
      count: toolUsage.web_search_calls,
    },
    {
      key: "x_search_calls",
      ...getToolConfig("x_search"),
      count: toolUsage.x_search_calls,
    },
    {
      key: "code_interpreter_calls",
      ...getToolConfig("code_interpreter"),
      count: toolUsage.code_interpreter_calls,
    },
    {
      key: "file_search_calls",
      ...getToolConfig("file_search"),
      count: toolUsage.file_search_calls,
    },
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

export default ToolUsageSummary;
