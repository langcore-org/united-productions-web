/**
 * LLM設定
 *
 * 各モデルの価格、コンテキスト長、推奨用途等の設定
 * 2026年2月時点の最新情報
 *
 * 現在使用中: Grokのみ
 */

import type { LLMProvider, ProviderInfo } from "./types";

/**
 * プロバイダー情報マップ
 *
 * 注意: 現在使用しているのはgrokのみ
 */
export const PROVIDER_CONFIG: Record<LLMProvider, ProviderInfo> = {
  // Google Gemini - 将来追加予定
  /*
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
  */

  // xAI Grok - 現在使用中
  "grok-4-1-fast-reasoning": {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    description: "Grok 4.1高速推論モデル。X検索対応。2Mコンテキスト。",
    inputPrice: 0.2,
    cachedInputPrice: 0.05,
    outputPrice: 0.5,
    contextLength: 2000000,
    recommendedFor: ["PJ-C", "人探し", "X検索", "リアルタイム情報"],
    isAvailable: true,
  },
  "grok-4.20-multi-agent-beta-latest": {
    id: "grok-4.20-multi-agent-beta-latest",
    name: "Grok 4.20 Multi-Agent",
    provider: "xAI",
    description: "Grok 4.20マルチエージェントベータ。エビデンスリサーチ特化。",
    inputPrice: 2.0,
    cachedInputPrice: 0.2,
    outputPrice: 6.0,
    contextLength: 2000000,
    recommendedFor: ["エビデンス", "高精度調査"],
    isAvailable: true,
  },

  // OpenAI - 将来追加予定
  /*
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
  */

  // Anthropic Claude - 将来追加予定
  // 'claude-sonnet-4.5': { ... },
  // 'claude-opus-4.6': { ... },

  // Perplexity - 将来追加予定
  /*
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
  */
};

/**
 * デフォルトプロバイダー
 */
export const DEFAULT_PROVIDER: LLMProvider = "grok-4-1-fast-reasoning";

/**
 * レート制限設定（リクエスト/分、リクエスト/日）
 */
export const RATE_LIMITS: Record<LLMProvider, { rpm: number; rpd: number }> = {
  // Google Gemini - 将来追加予定
  // 'gemini-2.5-flash-lite': { rpm: 30, rpd: 1500 },
  // 'gemini-3.0-flash': { rpm: 30, rpd: 1500 },

  // xAI Grok - 現在使用中
  "grok-4-1-fast-reasoning": { rpm: 60, rpd: 10000 },
  "grok-4.20-multi-agent-beta-latest": { rpm: 60, rpd: 10000 },

  // OpenAI - 将来追加予定
  // 'gpt-4o-mini': { rpm: 60, rpd: 10000 },
  // 'gpt-5': { rpm: 60, rpd: 10000 },

  // Anthropic: 現在未使用（将来追加時に有効化）
  // 'claude-sonnet-4.5': { rpm: 60, rpd: 10000 },
  // 'claude-opus-4.6': { rpm: 60, rpd: 10000 },

  // Perplexity - 将来追加予定
  // 'perplexity-sonar': { rpm: 60, rpd: 10000 },
  // 'perplexity-sonar-pro': { rpm: 60, rpd: 10000 },
} as const;

/**
 * Upstash Redis 無料枠設定
 * https://upstash.com/pricing
 */
export const UPSTASH_FREE_TIER = {
  // 無料枠: 10,000 requests/day
  dailyLimit: 10000,
  // レート制限: 100 requests/10s
  rateLimitPerSecond: 10,
} as const;

/**
 * キャッシュ設定
 */
export const CACHE_CONFIG = {
  // キャッシュ有効期限（秒）
  ttl: 60 * 60 * 24, // 24時間
  // キャッシュキープレフィックス
  keyPrefix: "llm:",
} as const;

/**
 * 無料枠レート制限設定
 */
export const FREE_TIER_LIMITS: Record<LLMProvider, { rpm: number; rpd: number }> = {
  "grok-4-1-fast-reasoning": { rpm: 60, rpd: 10000 },
  "grok-4.20-multi-agent-beta-latest": { rpm: 60, rpd: 10000 },
};

/**
 * プロジェクト別デフォルトプロバイダー
 */
export const PROJECT_DEFAULT_PROVIDERS: Record<string, LLMProvider> = {
  "PJ-A": "grok-4-1-fast-reasoning",
  "PJ-B": "grok-4-1-fast-reasoning",
  "PJ-C": "grok-4-1-fast-reasoning",
  "PJ-D": "grok-4-1-fast-reasoning",
};

/**
 * プロバイダー情報を取得
 */
export function getProviderInfo(provider: LLMProvider) {
  return PROVIDER_CONFIG[provider];
}
