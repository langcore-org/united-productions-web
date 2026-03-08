/**
 * Client-side Memory Manager
 *
 * ブラウザ側で動作するMemory管理クラス
 * 要約が必要な場合は /api/llm/summarize APIを呼び出す
 *
 * @created 2026-02-24
 * @updated 2026-02-25 動的圧縮率を追加、共通型を使用
 */

import type { LLMMessage, LLMProvider } from "../types";
import type {
  BaseMemoryOptions,
  CompressionRateEntry,
  MemoryContext,
  SummarizationEvent,
} from "./types";
import { DEFAULT_COMPRESSION_RATES } from "./types";

export type { CompressionRateEntry, MemoryContext, SummarizationEvent };

export interface ClientMemoryOptions extends BaseMemoryOptions {
  /**
   * 要約イベントが更新された時に呼ばれるコールバック
   * running → completed/error の遷移をリアルタイムで通知する
   */
  onSummarizationUpdate?: (event: SummarizationEvent) => void;
}

/**
 * クライアントサイド用 Memory クラス
 *
 * サーバーサイドの GrokClient を直接使わず、API 経由で要約を実行
 */
export class ClientMemory {
  private tokenThreshold: number;
  private maxRecentTurns: number;
  private compressionRates: CompressionRateEntry[];
  private maxSummaryTokens: number;

  private summary = "";
  private recentMessages: LLMMessage[] = [];
  private allMessages: LLMMessage[] = [];
  private provider: LLMProvider;
  private currentSummarization: SummarizationEvent | null = null;
  private summarizationHistory: SummarizationEvent[] = [];
  private onSummarizationUpdate?: (event: SummarizationEvent) => void;

  constructor(provider: LLMProvider, options: ClientMemoryOptions = {}) {
    this.provider = provider;
    this.tokenThreshold = options.tokenThreshold ?? 100_000;
    this.maxRecentTurns = options.maxRecentTurns ?? 10;
    this.compressionRates = options.compressionRates ?? DEFAULT_COMPRESSION_RATES;
    this.maxSummaryTokens = options.maxSummaryTokens ?? 20_000;
    this.onSummarizationUpdate = options.onSummarizationUpdate;
  }

  /**
   * メッセージを追加
   * 閾値超過時は自動的に要約を更新（API経由）
   */
  async addMessage(message: LLMMessage): Promise<void> {
    this.allMessages.push(message);
    this.recentMessages.push(message);

    // 閾値チェック
    if (this.shouldSummarize()) {
      await this.updateSummary();
      // 要約済みメッセージを削除し、直近のみ保持
      const keepCount = this.maxRecentTurns * 2; // 1ターン = user + assistant
      this.recentMessages = this.recentMessages.slice(-keepCount);
    }
  }

  /**
   * 複数メッセージを一括追加（初期ロード時用）
   */
  async addMessages(messages: LLMMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
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
   * 要約を更新（API経由）
   */
  private async updateSummary(): Promise<void> {
    const keepCount = this.maxRecentTurns * 2;
    const messagesToSummarize = this.recentMessages.slice(0, -keepCount);

    if (messagesToSummarize.length === 0) return;

    // 動的圧縮率を適用
    const tokensToSummarize = this.estimateTokens(messagesToSummarize);
    const targetTokens = this.calculateTargetSummaryTokens(tokensToSummarize);

    // 要約イベントを作成（running状態）
    const eventId = `summarization_${Date.now()}`;
    this.currentSummarization = {
      id: eventId,
      displayName: "文脈を要約中",
      status: "running",
      targetMessageCount: messagesToSummarize.length,
    };
    this.onSummarizationUpdate?.({ ...this.currentSummarization });

    try {
      const response = await fetch("/api/llm/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSummarize,
          provider: this.provider,
          targetTokens, // 動的圧縮率で計算した目標トークン数
          existingSummary: this.summary || undefined, // 既存の要約（文脈情報）
        }),
      });

      // Responseのbodyは一度しか読めないので、cloneしてから読み込む
      const responseClone = response.clone();

      if (!response.ok) {
        const error = await responseClone.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const { summary: newSummary } = (await response.json()) as { summary: string };

      // 要約を累積
      this.summary = this.summary ? `${this.summary}\n${newSummary}` : newSummary;

      // 要約完了（completed状態）
      if (this.currentSummarization) {
        this.currentSummarization.status = "completed";
        this.currentSummarization.displayName = `文脈を要約しました（${messagesToSummarize.length}件）`;
        this.summarizationHistory.push({ ...this.currentSummarization });
        this.onSummarizationUpdate?.({ ...this.currentSummarization });
        this.currentSummarization = null;
      }
    } catch (error) {
      console.error("[ClientMemory] Failed to update summary:", error);
      // 要約失敗（error状態）
      if (this.currentSummarization) {
        this.currentSummarization.status = "error";
        this.currentSummarization.displayName = "文脈の要約に失敗";
        this.currentSummarization.error = error instanceof Error ? error.message : "Unknown error";
        this.summarizationHistory.push({ ...this.currentSummarization });
        this.onSummarizationUpdate?.({ ...this.currentSummarization });
        this.currentSummarization = null;
      }
    }
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
      isSummarizing: !!this.currentSummarization,
    };
  }

  /**
   * 現在の要約イベントを取得
   */
  getCurrentSummarization(): SummarizationEvent | null {
    return this.currentSummarization;
  }

  /**
   * 要約イベント履歴を取得
   */
  getSummarizationHistory(): SummarizationEvent[] {
    return [...this.summarizationHistory];
  }
}
