/**
 * ストリーミングステップ表示コンポーネント
 *
 * @created 2026-02-22 11:50
 */

import {
  ContentMessage,
  ErrorMessage,
  ThinkingPlaceholderMessage,
  ToolCallMessage,
} from "./messages";
import type { StreamingStepsProps } from "./types";

export function StreamingSteps({
  content,
  toolCalls,
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

  // ツール呼び出しもコンテンツもない場合は「考え中...」を表示
  const hasAnyActivity = toolCalls.length > 0 || !!content;

  return (
    <div className="space-y-3">
      {/* 完了したツール呼び出し - 各ツールを個別のメッセージとして表示 */}
      {completedToolCalls.map((toolCall) => (
        <ToolCallMessage
          key={toolCall.id}
          toolCall={toolCall}
          status="completed"
          provider={provider}
        />
      ))}

      {/* 実行中のツール呼び出し */}
      {runningToolCalls.map((toolCall) => (
        <ToolCallMessage
          key={toolCall.id}
          toolCall={toolCall}
          status="running"
          provider={provider}
        />
      ))}

      {/* 何もない場合は「考え中...」を表示 */}
      {!hasAnyActivity && !isComplete && <ThinkingPlaceholderMessage provider={provider} />}

      {/* エラーメッセージ */}
      {error && <ErrorMessage error={error} />}

      {/* メインコンテンツ */}
      {(content || (isComplete && !content)) && (
        <ContentMessage
          content={content}
          provider={provider}
          isComplete={isComplete}
          usage={usage}
        />
      )}
    </div>
  );
}

export default StreamingSteps;
