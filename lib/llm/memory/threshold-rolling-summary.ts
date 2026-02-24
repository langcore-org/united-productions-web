/**
 * 閾値ベース Rolling Summary Memory
 *
 * 通常時は全履歴を送信し、閾値超過時のみ要約を生成する。
 * 動的圧縮率: 情報量に応じて要約サイズを調整
 *
 * @created 2026-02-24
 */

import type { LLMMessage } from "../types";
import type { GrokClient } from "../clients/grok";

export interface ThresholdRollingSummaryOptions {
  /** 要約開始閾値（トークン数）。デフォルト: 100000（100K） */
  tokenThreshold?: number;
  /** 直近保持するターン数（user+assistant = 1ターン）。デフォルト: 10 */
  maxRecentTurns?: number;
  /** 圧縮率テーブル */
  compressionRates?: CompressionRateEntry[];
  /** 最大要約トークン数（上限ガード）。デフォルト: 20000 */
  maxSummaryTokens?: number;
}

export interface CompressionRateEntry {
  /** 閾値（このトークン数以下で適用） */
  threshold: number;
  /** 圧縮率（0.0〜1.0） */
  rate: number;
}

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

// デフォルト圧縮率テーブル
const DEFAULT_COMPRESSION_RATES: CompressionRateEntry[] = [
  { threshold: 100_000, rate: 0.05 }, // 10万以下: 5%
  { threshold: 500_000, rate: 0.03 }, // 50万以下: 3%
  { threshold: 1_000_000, rate: 0.02 }, // 100万以下: 2%
  { threshold: Infinity, rate: 0.01 }, // それ以上: 1%
];

/**
 * 閾値ベース Rolling Summary Memory
 */
export class ThresholdRollingSummaryMemory {
  private tokenThreshold: number;
  private maxRecentTurns: number;
  private compressionRates: CompressionRateEntry[];
  private maxSummaryTokens: number;

  private summary = "";
  private recentMessages: LLMMessage[] = [];
  private allMessages: LLMMessage[] = [];

  constructor(options: ThresholdRollingSummaryOptions = {}) {
    this.tokenThreshold = options.tokenThreshold ?? 100_000;
    this.maxRecentTurns = options.maxRecentTurns ?? 10;
    this.compressionRates = options.compressionRates ?? DEFAULT_COMPRESSION_RATES;
    this.maxSummaryTokens = options.maxSummaryTokens ?? 20_000;
  }

  /**
   * メッセージを追加
   * 閾値超過時は自動的に要約を更新
   */
  async addMessage(message: LLMMessage, grokClient?: GrokClient): Promise<void> {
    this.allMessages.push(message);
    this.recentMessages.push(message);

    // 閾値チェック（GrokClientが提供されている場合のみ要約）
    if (grokClient && this.shouldSummarize()) {
      await this.updateSummary(grokClient);
      // 要約済みメッセージを削除し、直近のみ保持
      const keepCount = this.maxRecentTurns * 2; // 1ターン = user + assistant
      this.recentMessages = this.recentMessages.slice(-keepCount);
    }
  }

  /**
   * 複数メッセージを一括追加（初期ロード時用）
   */
  async addMessages(messages: LLMMessage[], grokClient?: GrokClient): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message, grokClient);
    }
  }

  /**
   * 要約が必要かどうかを判定
   */
  private shouldSummarize(): boolean {
    const estimatedTokens = this.estimateTokens(this.allMessages);
    return estimatedTokens > this.tokenThreshold;
  }

  /**
   * トークン数を概算
   * 簡易計算: 1文字 ≈ 0.25トークン（日本語・英語混在の平均）
   */
  estimateTokens(messages: LLMMessage[]): number {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.floor(totalChars * 0.25);
  }

  /**
   * 圧縮率を計算
   */
  private calculateCompressionRate(tokensToSummarize: number): number {
    for (const entry of this.compressionRates) {
      if (tokensToSummarize <= entry.threshold) {
        return entry.rate;
      }
    }
    return this.compressionRates[this.compressionRates.length - 1].rate;
  }

  /**
   * 目標要約トークン数を計算
   */
  private calculateTargetSummaryTokens(tokensToSummarize: number): number {
    const rate = this.calculateCompressionRate(tokensToSummarize);
    const targetTokens = Math.floor(tokensToSummarize * rate);
    return Math.min(targetTokens, this.maxSummaryTokens);
  }

  /**
   * 要約を更新
   */
  private async updateSummary(grokClient: GrokClient): Promise<void> {
    const keepCount = this.maxRecentTurns * 2;
    const messagesToSummarize = this.recentMessages.slice(0, -keepCount);

    if (messagesToSummarize.length === 0) return;

    const tokensToSummarize = this.estimateTokens(messagesToSummarize);
    const targetTokens = this.calculateTargetSummaryTokens(tokensToSummarize);
    const targetChars = Math.floor(targetTokens / 0.25); // トークン→文字数

    const prompt = this.buildSummaryPrompt(messagesToSummarize, targetChars);

    try {
      const response = await grokClient.chat([{ role: "user", content: prompt }]);
      const newSummary = response.content;

      // 要約を累積
      this.summary = this.summary ? `${this.summary}\n${newSummary}` : newSummary;
    } catch (error) {
      console.error("[ThresholdRollingSummaryMemory] Failed to update summary:", error);
      // 要約失敗時はそのまま続行（古い要約を保持）
    }
  }

  /**
   * 要約用プロンプトを構築
   */
  private buildSummaryPrompt(messages: LLMMessage[], targetChars: number): string {
    const conversation = messages
      .map((m) => `${m.role}: ${m.content.substring(0, 500)}`)
      .join("\n");

    const existingSummary = this.summary ? `\nこれまでの要約：\n${this.summary}` : "";

    return `
以下の会話を${targetChars}文字以内で要約してください。
重要な事実、結論、未解決事項を優先して含めてください。

【会話】
${conversation}${existingSummary}

【新しい要約】（${targetChars}文字以内）
`.trim();
  }

  /**
   * API送信用のコンテキストを取得
   */
  getContext(): MemoryContext {
    const estimatedTokens = this.estimateTokens(this.allMessages);

    if (!this.summary) {
      // 要約がない = 閾値未満 = 全履歴を返す
      return {
        messages: this.allMessages,
        recentTurns: Math.floor(this.allMessages.length / 2),
        estimatedTokens,
      };
    }

    // 要約 + 直近詳細
    const contextMessages: LLMMessage[] = [
      {
        role: "system",
        content: `これまでの会話の要約：\n${this.summary}`,
      },
      ...this.recentMessages,
    ];

    return {
      messages: contextMessages,
      summary: this.summary,
      recentTurns: Math.floor(this.recentMessages.length / 2),
      estimatedTokens,
    };
  }

  /**
   * DB保存用の全履歴を取得
   */
  getAllMessages(): LLMMessage[] {
    return this.allMessages;
  }

  /**
   * 現在の要約を取得
   */
  getSummary(): string {
    return this.summary;
  }

  /**
   * メモリをクリア
   */
  clear(): void {
    this.summary = "";
    this.recentMessages = [];
    this.allMessages = [];
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  getStatus(): {
    totalMessages: number;
    recentMessages: number;
    hasSummary: boolean;
    summaryLength: number;
    estimatedTokens: number;
    isSummarizing: boolean;
  } {
    return {
      totalMessages: this.allMessages.length,
      recentMessages: this.recentMessages.length,
      hasSummary: !!this.summary,
      summaryLength: this.summary.length,
      estimatedTokens: this.estimateTokens(this.allMessages),
      isSummarizing: this.estimateTokens(this.allMessages) > this.tokenThreshold,
    };
  }
}
