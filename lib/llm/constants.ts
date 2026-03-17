/**
 * LLM共通定数
 *
 * プロバイダー関連の定数を一元管理します。
 */

import type { LLMProvider } from "./types";

/**
 * プロバイダー表示名
 */
export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  // "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
  // "gemini-3.0-flash": "Gemini 3.0 Flash",
  "grok-4-1-fast-reasoning": "Grok 4.1 Fast",
  "grok-4-0709": "Grok 4",
  "grok-4.20-multi-agent-beta-latest": "Grok 4.20 Multi-Agent",
  // "gpt-4o-mini": "GPT-4o-mini",
  // "gpt-5": "GPT-5",
  // "claude-sonnet-4.5": "Claude 4.5 Sonnet",
  // "claude-opus-4.6": "Claude Opus 4.6",
  // "perplexity-sonar": "Perplexity Sonar",
  // "perplexity-sonar-pro": "Perplexity Sonar Pro",
};

/**
 * プロバイダーカラー
 */
export const PROVIDER_COLORS: Record<LLMProvider, string> = {
  // "gemini-2.5-flash-lite": "#4285f4",
  // "gemini-3.0-flash": "#4285f4",
  "grok-4-1-fast-reasoning": "#ff6b00",
  "grok-4-0709": "#ff6b00",
  "grok-4.20-multi-agent-beta-latest": "#ff6b00",
  // "gpt-4o-mini": "#10a37f",
  // "gpt-5": "#10a37f",
  // "claude-sonnet-4.5": "#d4a574",
  // "claude-opus-4.6": "#d4a574",
  // "perplexity-sonar": "#22c55e",
  // "perplexity-sonar-pro": "#22c55e",
};

/**
 * カテゴリ別プロバイダー
 */
export const PROVIDER_CATEGORIES: Record<string, LLMProvider[]> = {
  // google: ["gemini-2.5-flash-lite", "gemini-3.0-flash"],
  xai: ["grok-4-1-fast-reasoning", "grok-4-0709", "grok-4.20-multi-agent-beta-latest"],
  // openai: ["gpt-4o-mini", "gpt-5"],
  // anthropic: ["claude-sonnet-4.5", "claude-opus-4.6"],
  // perplexity: ["perplexity-sonar", "perplexity-sonar-pro"],
};

/**
 * カテゴリ表示名
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // google: "Google",
  xai: "xAI",
  // openai: "OpenAI",
  // anthropic: "Anthropic",
  // perplexity: "Perplexity",
};

/**
 * カテゴリカラー
 */
export const CATEGORY_COLORS: Record<string, string> = {
  // google: "#4285f4",
  xai: "#ff6b00",
  // openai: "#10a37f",
  // anthropic: "#d4a574",
  // perplexity: "#22c55e",
};
