/**
 * LLM設定
 * 
 * 各モデルの価格、コンテキスト長、推奨用途等の設定
 * 2026年2月時点の最新情報
 */

import { LLMProvider, ProviderInfo } from './types';

/**
 * プロバイダー情報マップ
 */
export const PROVIDER_CONFIG: Record<LLMProvider, ProviderInfo> = {
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'Google',
    description: '最安値・高速モデル。Google AI Studio無料枠対応。',
    inputPrice: 0.075,
    outputPrice: 0.30,
    contextLength: 1000000,
    recommendedFor: ['PJ-A', 'PJ-B', 'PJ-D', 'テキスト整形', '軽量タスク'],
    isAvailable: true,
  },
  'gemini-3.0-flash': {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash',
    provider: 'Google',
    description: '高品質タスク用。Google AI Studio無料枠対応。',
    inputPrice: 0.50,
    outputPrice: 3.00,
    contextLength: 1000000,
    recommendedFor: ['高品質タスク', '複雑な推論'],
    isAvailable: true,
  },
  'grok-4.1-fast': {
    id: 'grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: 'xAI',
    description: 'X検索対応。高速でコスパ良好。',
    inputPrice: 0.20,
    outputPrice: 0.50,
    contextLength: 2000000,
    recommendedFor: ['PJ-C', '人探し', 'X検索', 'リアルタイム情報'],
    isAvailable: true,
  },
  'grok-4': {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    description: 'xAI最高品質モデル。',
    inputPrice: 3.00,
    outputPrice: 15.00,
    contextLength: 2000000,
    recommendedFor: ['最高品質', '複雑なタスク'],
    isAvailable: true,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o-mini',
    provider: 'OpenAI',
    description: 'コスパ良好な軽量モデル。',
    inputPrice: 0.15,
    outputPrice: 0.60,
    contextLength: 128000,
    recommendedFor: ['コスパ重視', '軽量タスク'],
    isAvailable: true,
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'OpenAI最新フラッグシップモデル。',
    inputPrice: 1.25,
    outputPrice: 10.00,
    contextLength: 400000,
    recommendedFor: ['高品質タスク', '長文コンテキスト'],
    isAvailable: true,
  },
  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4.5',
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    description: 'バランス型モデル。思考プロセス表示対応。',
    inputPrice: 3.00,
    outputPrice: 15.00,
    contextLength: 200000,
    recommendedFor: ['バランス重視', '推論タスク'],
    isAvailable: true,
  },
  'claude-opus-4.6': {
    id: 'claude-opus-4.6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    description: 'Anthropic最高品質モデル。',
    inputPrice: 5.00,
    outputPrice: 25.00,
    contextLength: 200000,
    recommendedFor: ['最高品質', '複雑なコーディング', '研究'],
    isAvailable: true,
  },
  'perplexity-sonar': {
    id: 'perplexity-sonar',
    name: 'Perplexity Sonar',
    provider: 'Perplexity',
    description: 'エビデンス付き検索。ソース付き回答。',
    inputPrice: 1.00,
    outputPrice: 1.00,
    contextLength: 128000,
    recommendedFor: ['PJ-C', 'エビデンス検索', 'ソース付き回答'],
    isAvailable: true,
  },
  'perplexity-sonar-pro': {
    id: 'perplexity-sonar-pro',
    name: 'Perplexity Sonar Pro',
    provider: 'Perplexity',
    description: '高品質検索モデル。',
    inputPrice: 2.00,
    outputPrice: 2.00,
    contextLength: 128000,
    recommendedFor: ['高品質検索', '詳細な調査'],
    isAvailable: true,
  },
};

/**
 * デフォルトプロバイダー
 */
export const DEFAULT_PROVIDER: LLMProvider = 'grok-4.1-fast';

/**
 * PJ別デフォルトプロバイダー
 */
export const PROJECT_DEFAULT_PROVIDERS: Record<string, LLMProvider> = {
  'PJ-A': 'grok-4.1-fast',      // 議事録整形
  'PJ-B': 'grok-4.1-fast',      // 書き起こし整形
  'PJ-C-people': 'grok-4.1-fast',       // 人探し（X検索）
  'PJ-C-evidence': 'grok-4.1-fast',  // エビデンス検索（一時的にgrokで統一）
  'PJ-D': 'grok-4.1-fast',      // ロケスケ
};

/**
 * Google AI Studio 無料枠設定
 * https://ai.google.dev/pricing?hl=ja
 */
export const GEMINI_FREE_TIER = {
  'gemini-2.5-flash-lite': {
    rpm: 30,  // Requests Per Minute
    rpd: 1500, // Requests Per Day
  },
  'gemini-3.0-flash': {
    rpm: 30,
    rpd: 1500,
  },
} as const;

/**
 * 無料枠制限設定（全プロバイダー）
 * 各プロバイダーの無料枠またはデフォルト制限
 */
export const FREE_TIER_LIMITS: Record<LLMProvider, { rpm: number; rpd: number }> = {
  // Google AI Studio 無料枠: 30 RPM / 1,500 RPD
  'gemini-2.5-flash-lite': { rpm: 30, rpd: 1500 },
  'gemini-3.0-flash': { rpm: 30, rpd: 1500 },
  // xAI Grok: デフォルト制限（有料API前提）
  'grok-4.1-fast': { rpm: 60, rpd: 10000 },
  'grok-4': { rpm: 60, rpd: 10000 },
  // OpenAI: デフォルト制限（有料API前提）
  'gpt-4o-mini': { rpm: 60, rpd: 10000 },
  'gpt-5': { rpm: 60, rpd: 10000 },
  // Anthropic: デフォルト制限（有料API前提）
  'claude-sonnet-4.5': { rpm: 60, rpd: 10000 },
  'claude-opus-4.6': { rpm: 60, rpd: 10000 },
  // Perplexity: デフォルト制限（有料API前提）
  'perplexity-sonar': { rpm: 60, rpd: 10000 },
  'perplexity-sonar-pro': { rpm: 60, rpd: 10000 },
} as const;

/**
 * Upstash Redis 無料枠設定
 * https://upstash.com/pricing
 */
export const UPSTASH_FREE_TIER = {
  /** 1日あたりの最大コマンド数 */
  maxCommandsPerDay: 10000,
  /** 1秒あたりの最大リクエスト数 */
  maxRequestsPerSecond: 100,
  /** ストレージ容量（MB） */
  storageMB: 256,
  /** 最大キー数 */
  maxKeys: 10000,
} as const;

/**
 * キャッシュ設定
 */
export const CACHE_CONFIG = {
  /** LLMレスポンスキャッシュ有効期限（秒）: 24時間 */
  ttlSeconds: 24 * 60 * 60,
  /** 最大キャッシュサイズ（キー数） */
  maxKeys: UPSTASH_FREE_TIER.maxKeys,
  /** キャッシュキープレフィックス */
  keyPrefix: 'aihub:llm:',
} as const;

/**
 * レート制限設定
 */
export const RATE_LIMIT_CONFIG = {
  /** 識別子の種類 */
  identifierType: 'ip', // 'ip' | 'user' | 'session'
  /** レート制限超過時のリトライ間隔（秒） */
  retryAfterSeconds: 60,
  /** ヘッダーに制限情報を含めるか */
  includeHeaders: true,
} as const;

/**
 * プロバイダー一覧を取得
 */
export function getAvailableProviders(): ProviderInfo[] {
  return Object.values(PROVIDER_CONFIG).filter(p => p.isAvailable);
}

/**
 * プロバイダー情報を取得
 */
export function getProviderInfo(provider: LLMProvider): ProviderInfo {
  return PROVIDER_CONFIG[provider];
}

/**
 * コストを計算
 * @param provider - プロバイダー
 * @param inputTokens - 入力トークン数
 * @param outputTokens - 出力トークン数
 * @returns コスト（USD）
 */
export function calculateCost(
  provider: LLMProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const config = PROVIDER_CONFIG[provider];
  const inputCost = (inputTokens / 1000000) * config.inputPrice;
  const outputCost = (outputTokens / 1000000) * config.outputPrice;
  return Number((inputCost + outputCost).toFixed(6));
}
