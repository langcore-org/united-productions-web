/**
 * ストリーミングステップ表示コンポーネント
 *
 * @created 2026-02-22 11:50
 */

import {
  ContentMessage,
  ErrorMessage,
  LegacyThinkingMessage,
  NewThinkingStepMessage,
  ThinkingPlaceholderMessage,
  ThinkingStepMessage,
  ToolCallMessage,
} from "./messages";
import type { StreamingStepsProps } from "./types";

export function StreamingSteps({
  content,
  thinking,
  toolCalls,
  reasoningSteps,
  thinkingSteps,
  isAccepted,
  toolUsage,
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

  // 何もない場合は「考え中...」を表示
  const hasAnyActivity =
    thinkingSteps.length > 0 ||
    reasoningSteps.length > 0 ||
    toolCalls.length > 0 ||
    content ||
    thinking;

  return (
    <div className="space-y-3">
      {/* リクエスト受理直後の「考え中...」表示 */}
      {!isAccepted && !isComplete && <ThinkingPlaceholderMessage provider={provider} />}

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

      {/* 新しい思考ステップ - 各ステップを個別のメッセージとして表示 */}
      {thinkingSteps.map((step, index) => {
        const isLastStep = index === thinkingSteps.length - 1;
        const isActive = isLastStep && !isComplete;
        return (
          <NewThinkingStepMessage
            key={step.id}
            step={step}
            provider={provider}
            isActive={isActive}
          />
        );
      })}

      {/* レガシー思考ステップ（後方互換） */}
      {reasoningSteps.map((step, index) => {
        const isLastStep = index === reasoningSteps.length - 1;
        const isActive = isLastStep && !isComplete;
        return (
          <ThinkingStepMessage
            key={`legacy-${step.step}-${index}`}
            step={step}
            provider={provider}
            isActive={isActive}
            stepNumber={index + 1}
          />
        );
      })}

      {/* レガシー思考表示 */}
      {thinking && reasoningSteps.length === 0 && thinkingSteps.length === 0 && (
        <LegacyThinkingMessage thinking={thinking} provider={provider} isComplete={isComplete} />
      )}

      {/* 何もない場合は「考え中...」を表示 */}
      {!hasAnyActivity && !isComplete && isAccepted && (
        <ThinkingPlaceholderMessage provider={provider} />
      )}

      {/* エラーメッセージ */}
      {error && <ErrorMessage error={error} />}

      {/* メインコンテンツ */}
      {(content || (isComplete && !content)) && (
        <ContentMessage
          content={content}
          provider={provider}
          isComplete={isComplete}
          toolUsage={toolUsage}
          usage={usage}
        />
      )}
    </div>
  );
}

export default StreamingSteps;
