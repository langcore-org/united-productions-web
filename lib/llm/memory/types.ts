/**
 * Memory管理の共通型定義
 *
 * ClientMemoryとThresholdRollingSummaryMemoryで共有する型
 *
 * @created 2026-02-25
 */

import type { LLMMessage } from "../types";

/**
 * 圧縮率エントリ
 */
export interface CompressionRateEntry {
  /** 閾値（このトークン数以下で適用） */
  threshold: number;
  /** 圧縮率（0.0〜1.0） */
  rate: number;
}

/**
 * Memoryコンテキスト
 */
export interface MemoryContext {
  /** API送信用メッセージ */
  messages: LLMMessage[];
  /** 要約文（あれば） */
  summary?: string;
  /** 直近ターン数 */
  recentTurns: number;
  /** 推定トークン数 */
  estimatedTokens: number;
}

/**
 * 基本Memoryオプション
 */
export interface BaseMemoryOptions {
  /** 要約開始閾値（トークン数）。デフォルト: 100000（100K） */
  tokenThreshold?: number;
  /** 直近保持するターン数（user+assistant = 1ターン）。デフォルト: 10 */
  maxRecentTurns?: number;
  /** 圧縮率テーブル */
  compressionRates?: CompressionRateEntry[];
  /** 最大要約トークン数（上限ガード）。デフォルト: 20000 */
  maxSummaryTokens?: number;
}

/**
 * デフォルト圧縮率テーブル
 *
 * トークン数に応じて段階的に圧縮率を下げる
 * - 小さい要約ほど高圧縮（情報密度を保つ）
 * - 大きい要約ほど低圧縮（情報量を保つ）
 */
export const DEFAULT_COMPRESSION_RATES: CompressionRateEntry[] = [
  { threshold: 100_000, rate: 0.05 }, // 10万以下: 5%
  { threshold: 500_000, rate: 0.03 }, // 50万以下: 3%
  { threshold: 1_000_000, rate: 0.02 }, // 100万以下: 2%
  { threshold: Infinity, rate: 0.01 }, // それ以上: 1%
];

/**
 * Memoryインターフェース
 *
 * すべてのMemory実装が満たすべき契約
 */
export interface Memory {
  /** メッセージを追加 */
  addMessage(message: LLMMessage): Promise<void>;

  /** 複数メッセージを一括追加 */
  addMessages(messages: LLMMessage[]): Promise<void>;

  /** API送信用のコンテキストを取得 */
  getContext(): MemoryContext;

  /** DB保存用の全履歴を取得 */
  getAllMessages(): LLMMessage[];

  /** 現在の要約を取得 */
  getSummary(): string;

  /** メモリをクリア */
  clear(): void;

  /** トークン数を概算 */
  estimateTokens(messages: LLMMessage[]): number;
}
