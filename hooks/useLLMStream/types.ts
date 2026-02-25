/**
 * useLLMStream フック用型定義（新SSEイベント形式対応）
 */

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

/**
 * 要約イベント情報（ツール呼び出しと同様の時系列表示）
 */
export interface SummarizationEvent {
  /** 一意のID */
  id: string;
  /** 表示名 */
  displayName: string;
  /** 状態 */
  status: "running" | "completed" | "error";
  /** 要約対象のメッセージ数 */
  targetMessageCount: number;
  /** エラーメッセージ（失敗時） */
  error?: string;
}
