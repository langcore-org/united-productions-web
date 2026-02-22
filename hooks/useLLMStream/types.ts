/**
 * useLLMStream フック用型定義
 * 
 * @created 2026-02-22 11:55
 */

/**
 * ツールオプションの型
 */
export interface ToolOptions {
  enableWebSearch?: boolean;
}

/**
 * Usage情報の型
 */
export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * ツール呼び出し情報
 */
export interface ToolCallInfo {
  id: string;
  type: string;
  name?: string;
  input?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * 思考ステップ情報（レガシー）
 */
export interface ReasoningStepInfo {
  step: number;
  content: string;
  tokens?: number;
}

/**
 * ツール使用状況
 */
export interface ToolUsageInfo {
  web_search_calls?: number;
  x_search_calls?: number;
  code_interpreter_calls?: number;
  file_search_calls?: number;
  mcp_calls?: number;
  document_search_calls?: number;
}

/**
 * 思考ステップ情報（新しい形式）
 */
export interface ThinkingStepInfo {
  step: number;
  id: string;
  title: string;
  content?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
}
