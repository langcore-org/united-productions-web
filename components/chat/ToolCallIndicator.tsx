"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Twitter, 
  Terminal, 
  FileSearch, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  BrainCircuit
} from "lucide-react";

export interface ToolCall {
  id: string;
  type: string;
  name?: string;
  input?: string;
  status: "pending" | "running" | "completed" | "failed";
}

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
  className?: string;
}

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

interface ToolCallItemProps {
  tool: ToolCall;
}

function ToolCallItem({ tool }: ToolCallItemProps) {
  const config = toolConfig[tool.type] || toolConfig[tool.name || ""] || {
    icon: BrainCircuit,
    label: tool.name || tool.type,
    color: "text-gray-500",
  };
  
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
      <div className={`${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-gray-700 font-medium">{config.label}</span>
      {tool.status === "running" && (
        <Loader2 className="w-3 h-3 text-gray-400 animate-spin ml-auto" />
      )}
      {tool.status === "completed" && (
        <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
      )}
      {tool.status === "failed" && (
        <XCircle className="w-3 h-3 text-red-500 ml-auto" />
      )}
      {tool.status === "pending" && (
        <div className="w-3 h-3 rounded-full bg-gray-300 ml-auto" />
      )}
    </div>
  );
}

export function ToolCallIndicator({ toolCalls, className = "" }: ToolCallIndicatorProps) {
  const [visibleCalls, setVisibleCalls] = useState<ToolCall[]>([]);
  
  useEffect(() => {
    // 重複を除去して最新のステータスを保持
    const callMap = new Map<string, ToolCall>();
    toolCalls.forEach(call => {
      callMap.set(call.id, call);
    });
    setVisibleCalls(Array.from(callMap.values()));
  }, [toolCalls]);
  
  if (visibleCalls.length === 0) return null;
  
  const runningCount = visibleCalls.filter(c => c.status === "running").length;
  const completedCount = visibleCalls.filter(c => c.status === "completed").length;
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
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
        {visibleCalls.map((tool) => (
          <ToolCallItem key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

interface ToolUsageSummaryProps {
  toolUsage?: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  };
  className?: string;
}

export function ToolUsageSummary({ toolUsage, className = "" }: ToolUsageSummaryProps) {
  if (!toolUsage) return null;
  
  const items = [
    { key: "web_search_calls", label: "Web検索", count: toolUsage.web_search_calls, icon: Search, color: "text-blue-500" },
    { key: "x_search_calls", label: "X検索", count: toolUsage.x_search_calls, icon: Twitter, color: "text-sky-500" },
    { key: "code_interpreter_calls", label: "コード実行", count: toolUsage.code_interpreter_calls, icon: Terminal, color: "text-green-500" },
    { key: "file_search_calls", label: "ファイル検索", count: toolUsage.file_search_calls, icon: FileSearch, color: "text-purple-500" },
  ].filter(item => item.count && item.count > 0);
  
  if (items.length === 0) return null;
  
  return (
    <div className={`flex flex-wrap gap-3 text-xs text-gray-500 ${className}`}>
      {items.map(({ key, label, count, icon: Icon, color }) => (
        <div key={key} className="flex items-center gap-1">
          <Icon className={`w-3 h-3 ${color}`} />
          <span>{label}: {count}回</span>
        </div>
      ))}
    </div>
  );
}
