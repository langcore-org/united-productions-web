/**
 * LLM統合の型定義
 *
 * 現在使用中: Grokのみ
 * 将来追加予定: Gemini, OpenAI, Perplexity, Claude
 */

// ============================================
// Grokツール型
// ============================================

/**
 * Grok Agent Tools（3ツール固定）
 * collections_search は廃止済み
 */
export type GrokToolType = "web_search" | "x_search" | "code_execution";

// ============================================
// 新SSEイベント型（discriminated union）
// ============================================

/**
 * SSEイベント型（/api/llm/stream から送信される全イベント）
 *
 * type フィールドで discriminated union として定義。
 * フロントエンドは event.type で分岐する。
 */
export type SSEEvent =
  | { type: "start" }
  | {
      type: "tool_call";
      id: string;
      name: GrokToolType;
      displayName: string;
      status: "running" | "completed";
      /** ツールへの入力（クエリ文字列など）- 取得できた場合のみ */
      input?: string;
    }
  | { type: "content"; delta: string }
  | {
      type: "done";
      usage: {
        inputTokens: number;
        outputTokens: number;
        cost: number;
        /** ツール使用回数 { web_search: 2, x_search: 1 } */
        toolCalls: Record<string, number>;
      };
    }
  | { type: "error"; message: string };

/**
 * LLMプロバイダー定数配列
 * Single Source of Truth - 全てのプロバイダー定義はここから派生
 *
 * 注意: 現在使用しているのはgrokのみ
 */
export const VALID_PROVIDERS = [
  // Google Gemini - 将来追加予定
  // 'gemini-2.5-flash-lite',
  // 'gemini-3.0-flash',

  // xAI Grok - 現在使用中
  "grok-4-1-fast-reasoning",
  "grok-4-0709",

  // OpenAI - 将来追加予定
  // 'gpt-4o-mini',
  // 'gpt-5',

  // Anthropic Claude - 将来追加予定
  // 'claude-sonnet-4.5',
  // 'claude-opus-4.6',

  // Perplexity - 将来追加予定
  // 'perplexity-sonar',
  // 'perplexity-sonar-pro',
] as const;

/**
 * LLMプロバイダー型
 * 全10モデルをサポート
 */
export type LLMProvider = (typeof VALID_PROVIDERS)[number];

/**
 * メッセージのロール型
 */
export type LLMMessageRole = "user" | "assistant" | "system";

/**
 * LLMメッセージインターフェース
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/**
 * トークン使用量情報
 */
export interface LLMUsage {
  /** 入力トークン数 */
  inputTokens: number;
  /** 出力トークン数 */
  outputTokens: number;
  /** 推定コスト（USD） */
  cost: number;
}

/**
 * LLMレスポンスインターフェース
 */
export interface LLMResponse {
  /** 生成されたコンテンツ */
  content: string;
  /** 思考プロセス（Claude等の思考モデル用） */
  thinking?: string;
  /** トークン使用量 */
  usage?: LLMUsage;
}

/**
 * ツール呼び出し情報
 */
export interface ToolCallInfo {
  /** ツールID */
  id: string;
  /** ツールタイプ */
  type: string;
  /** ツール名 */
  name?: string;
  /** 入力パラメータ */
  input?: string;
  /** ステータス */
  status: "pending" | "running" | "completed" | "failed";
  /** 実行結果 */
  result?: string;
}

/**
 * 思考ステップ情報
 */
export interface ReasoningStep {
  /** ステップ番号 */
  step: number;
  /** 思考内容 */
  content: string;
  /** 推論トークン数 */
  tokens?: number;
}

/**
 * 思考ステップの型
 */
export interface ThinkingStep {
  /** ステップ番号 */
  step: number;
  /** ステップID（一意） */
  id: string;
  /** ステップのタイトル */
  title: string;
  /** ステップの説明/内容 */
  content?: string;
  /** ステップの状態 */
  status: "pending" | "running" | "completed" | "error";
  /** ステップタイプ */
  type: "thinking" | "search" | "analysis" | "synthesis" | "complete";
}

/**
 * ツール呼び出しイベント
 */
export interface ToolCallEvent {
  /** ツールID */
  id: string;
  /** ツールタイプ */
  type: string;
  /** ツール名 */
  name?: string;
  /** 入力パラメータ */
  input?: string;
  /** ステータス */
  status: "pending" | "running" | "completed" | "failed";
}

/**
 * LLMストリーミングチャンク
 */
export interface LLMStreamChunk {
  /** チャンクの内容 */
  content: string;
  /** 思考プロセスのチャンク */
  thinking?: string;
  /** 最後のチャンクかどうか */
  isDone?: boolean;
  /** ツール呼び出し情報 */
  toolCall?: ToolCallInfo;
  /** 思考ステップ（レガシー） */
  reasoningStep?: ReasoningStep;
  /** ツール使用状況の更新 */
  toolUsage?: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  };
  /** 新しい思考ステップイベント */
  stepStart?: ThinkingStep;
  /** ステップ更新イベント */
  stepUpdate?: {
    id: string;
    content?: string;
    status?: "pending" | "running" | "completed" | "error";
  };
  /** ツール呼び出しイベント */
  toolCallEvent?: ToolCallEvent;
}

/**
 * LLMクライアントインターフェース
 * 全プロバイダーが実装する必要がある
 */
export interface LLMClient {
  /**
   * チャット完了を取得
   * @param messages - メッセージ配列
   * @returns LLMレスポンス
   */
  chat(messages: LLMMessage[]): Promise<LLMResponse>;

  /**
   * ストリーミングレスポンスを取得（テキストのみ・後方互換）
   * @param messages - メッセージ配列
   * @returns 文字列の非同期イテレータ
   */
  stream(messages: LLMMessage[]): AsyncIterable<string>;

  /**
   * 新SSEイベント形式でストリーミングレスポンスを取得
   * ツール呼び出し・usage情報を含む
   * @param messages - メッセージ配列
   * @returns SSEEvent の非同期イテレータ
   */
  streamWithUsage?(messages: LLMMessage[]): AsyncIterable<SSEEvent>;
}

/**
 * LLM設定オプション
 */
export interface LLMOptions {
  /** 温度（0-2） */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** トップP */
  topP?: number;
  /** システムプロンプト */
  systemPrompt?: string;
}

/**
 * プロバイダー情報
 */
export interface ProviderInfo {
  /** プロバイダーID */
  id: LLMProvider;
  /** 表示名 */
  name: string;
  /** プロバイダー名（Google, xAI等） */
  provider: string;
  /** 説明 */
  description: string;
  /** 入力価格（$/1M tokens） */
  inputPrice: number;
  /** 出力価格（$/1M tokens） */
  outputPrice: number;
  /** コンテキスト長（トークン） */
  contextLength: number;
  /** 推奨用途 */
  recommendedFor: string[];
  /** 利用可能かどうか */
  isAvailable: boolean;
}
