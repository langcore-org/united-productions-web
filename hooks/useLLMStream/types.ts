/**
 * useLLMStream フック用型定義（新SSEイベント形式対応）
 */

import type { SummarizationEvent } from "@/lib/llm/memory/types";

// SummarizationEvent は memory 層が正規定義 - 再エクスポート
export type { SummarizationEvent };

/**
 * ストリーミングの状態フェーズ
 *
 * isPending/isComplete の二つのbooleanが矛盾する状態を取り得る問題を解消するため、
 * 状態を単一のenum値で管理する。
 *
 * 遷移図:
 *   idle → preparing → streaming → complete
 *                    ↘ error
 *                    ↘ cancelled
 *   (complete/error/cancelled) → idle (resetStream時)
 */
export type StreamPhase =
  | "idle" // 初期状態・resetStream後
  | "preparing" // memory前処理中（要約処理など）、LLMリクエスト準備中
  | "streaming" // LLMからレスポンス受信中
  | "complete" // 正常完了
  | "error" // エラー終了
  | "cancelled"; // キャンセル

/**
 * Usage情報の型
 */
export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  /** ツール使用回数 { web_search: 2, x_search: 1 } */
  toolCalls?: Record<string, number>;
}

/**
 * ツール呼び出し情報（ストリーミング中の個別ツール追跡）
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: "running" | "completed";
  input?: string;
}

/**
 * フォローアップ質問情報
 */
export interface FollowUpInfo {
  questions: string[];
  isLoading: boolean;
  error: string | null;
}
