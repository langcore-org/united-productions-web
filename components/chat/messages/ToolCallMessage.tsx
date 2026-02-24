/**
 * ツール呼び出しメッセージコンポーネント
 *
 * @created 2026-02-22 11:50
 */

import { CheckCircle2, Loader2 } from "lucide-react";
import { getToolConfig } from "@/lib/tools/config";
import type { ToolCallMessageProps } from "../types";

export function ToolCallMessage({ toolCall, status, provider }: ToolCallMessageProps) {
  const config = getToolConfig(toolCall.name);
  const Icon = config.icon;

  return (
    <div className="flex gap-4 px-4 py-2">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] items-start">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-gray-600">AI Assistant</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            {provider}
          </span>
        </div>
        <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm">
          <div className="flex items-center gap-2">
            {status === "running" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            <span className="font-medium">{config.label}</span>
            {toolCall.input && (
              <span className="text-blue-700/70 text-xs truncate max-w-[200px]">
                {toolCall.input}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolCallMessage;
