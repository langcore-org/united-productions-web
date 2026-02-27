/**
 * ストリーミングステップ表示コンポーネント
 *
 * @created 2026-02-22 11:50
 * @updated 2026-02-27 ヘッダーを1回だけ表示するように変更
 */

import { Bot, Loader2 } from "lucide-react";
import {
  CitationsList,
  ContentMessage,
  ErrorMessage,
  SummarizationMessage,
  ThinkingPlaceholderMessage,
  ToolCallMessage,
} from "./messages";
import type { StreamingStepsProps } from "./types";

export function StreamingSteps({
  content,
  toolCalls,
  citations,
  summarizationEvents,
  usage,
  provider,
  isComplete,
  error,
}: StreamingStepsProps) {
  // 重複を除去したツール呼び出し
  const uniqueToolCalls = toolCalls.filter(
    (call, index, self) => index === self.findIndex((c) => c.id === call.id),
  );

  // 完了したツール呼び出し
  const completedToolCalls = uniqueToolCalls.filter((call) => call.status === "completed");
  // 実行中のツール呼び出し
  const runningToolCalls = uniqueToolCalls.filter((call) => call.status === "running");

  // 完了した要約イベント
  const completedSummarizations = summarizationEvents.filter((e) => e.status === "completed");
  // 実行中の要約イベント
  const runningSummarizations = summarizationEvents.filter((e) => e.status === "running");
  // エラーの要約イベント
  const errorSummarizations = summarizationEvents.filter((e) => e.status === "error");

  // ツール呼び出しもコンテンツもない場合は「考え中...」を表示
  const hasAnyActivity = toolCalls.length > 0 || summarizationEvents.length > 0 || !!content;

  // ヘッダーを表示すべきか（1回目のみ）
  const hasAnyContent =
    completedSummarizations.length > 0 ||
    completedToolCalls.length > 0 ||
    runningSummarizations.length > 0 ||
    runningToolCalls.length > 0 ||
    errorSummarizations.length > 0 ||
    !!content ||
    citations.length > 0;

  return (
    <div className="space-y-3">
      {/* ヘッダー - Teddy + アイコン（1回だけ表示） */}
      {hasAnyContent && (
        <div className="flex gap-4 px-4 py-2">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-black to-gray-800 shadow-lg">
            {isComplete ? (
              <Bot className="w-4 h-4 text-white" />
            ) : (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            )}
          </div>
          <div className="flex-1 max-w-[85%] items-start">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium text-gray-600">Teddy</span>

              {!isComplete && (
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
                  生成中...
                </span>
              )}
            </div>

            {/* ここから下に各種メッセージをネスト */}
            <div className="space-y-3">
              {/* 完了した要約イベント */}
              {completedSummarizations.map((event) => (
                <SummarizationMessage
                  key={event.id}
                  event={event}
                  provider={provider}
                  showHeader={false}
                />
              ))}

              {/* 完了したツール呼び出し（ヘッダーなし） */}
              {completedToolCalls.map((toolCall) => (
                <ToolCallMessage
                  key={toolCall.id}
                  toolCall={toolCall}
                  status="completed"
                  provider={provider}
                  citations={citations}
                  showHeader={false}
                />
              ))}

              {/* 実行中の要約イベント */}
              {runningSummarizations.map((event) => (
                <SummarizationMessage
                  key={event.id}
                  event={event}
                  provider={provider}
                  showHeader={false}
                />
              ))}

              {/* 実行中のツール呼び出し（ヘッダーなし） */}
              {runningToolCalls.map((toolCall) => (
                <ToolCallMessage
                  key={toolCall.id}
                  toolCall={toolCall}
                  status="running"
                  provider={provider}
                  citations={citations}
                  showHeader={false}
                />
              ))}

              {/* エラーの要約イベント */}
              {errorSummarizations.map((event) => (
                <SummarizationMessage
                  key={event.id}
                  event={event}
                  provider={provider}
                  showHeader={false}
                />
              ))}

              {/* 何もない場合は「考え中...」を表示 */}
              {!hasAnyActivity && !isComplete && (
                <ThinkingPlaceholderMessage provider={provider} showHeader={false} />
              )}

              {/* エラーメッセージ */}
              {error && <ErrorMessage error={error} showHeader={false} />}

              {/* メインコンテンツ */}
              {content && !isComplete && (
                <div className="relative px-4 py-3 text-sm leading-relaxed rounded-2xl bg-white text-gray-800 border border-gray-200 rounded-tl-sm">
                  <div className="whitespace-pre-wrap">
                    {content}
                    {!isComplete && (
                      <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              )}

              {/* Usage Info */}
              {isComplete && usage && (
                <div className="text-xs text-gray-400">
                  {usage.inputTokens.toLocaleString()} 入力 / {usage.outputTokens.toLocaleString()}{" "}
                  出力 • ${usage.cost.toFixed(6)}
                </div>
              )}

              {/* 引用URL */}
              {citations.length > 0 && <CitationsList citations={citations} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StreamingSteps;
