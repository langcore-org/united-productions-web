/**
 * LLM統合の型定義
 * 
 * 複数のLLMプロバイダーを統一インターフェースで利用するための型定義
 * 対応プロバイダー: Gemini, Grok, OpenAI, Anthropic, Perplexity
 */

/**
 * LLMプロバイダー型
 * 全10モデルをサポート
 */
export type LLMProvider =
  | 'gemini-2.5-flash-lite'
  | 'gemini-3.0-flash'
  | 'grok-4-1-fast-reasoning'  // xAI Grok 4.1 Fast（推論モード）
  | 'grok-4-0709'              // xAI Grok 4 標準版
  | 'gpt-4o-mini'
  | 'gpt-5'
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.6'
  | 'perplexity-sonar'
  | 'perplexity-sonar-pro';

/**
 * メッセージのロール型
 */
export type LLMMessageRole = 'user' | 'assistant' | 'system';

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
 * LLMストリーミングチャンク
 */
export interface LLMStreamChunk {
  /** チャンクの内容 */
  content: string;
  /** 思考プロセスのチャンク */
  thinking?: string;
  /** 最後のチャンクかどうか */
  isDone?: boolean;
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
   * ストリーミングレスポンスを取得
   * @param messages - メッセージ配列
   * @returns 文字列の非同期イテレータ
   */
  stream(messages: LLMMessage[]): AsyncIterable<string>;
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
