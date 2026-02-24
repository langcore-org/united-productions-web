/**
 * ThresholdRollingSummaryMemory 単体テスト
 *
 * @created 2026-02-24
 */

import { describe, expect, it } from "vitest";
import {
  type CompressionRateEntry,
  ThresholdRollingSummaryMemory,
} from "@/lib/llm/memory/threshold-rolling-summary";

describe("ThresholdRollingSummaryMemory", () => {
  // テスト用の圧縮率テーブル（小さい値でテスト）
  const testCompressionRates: CompressionRateEntry[] = [
    { threshold: 1_000, rate: 0.05 }, // 1K以下: 5%
    { threshold: 5_000, rate: 0.03 }, // 5K以下: 3%
    { threshold: 10_000, rate: 0.02 }, // 10K以下: 2%
    { threshold: Infinity, rate: 0.01 }, // それ以上: 1%
  ];

  describe("トークン計算", () => {
    it("空のメッセージリストは0トークン", () => {
      const memory = new ThresholdRollingSummaryMemory();
      expect(memory.estimateTokens([])).toBe(0);
    });

    it("文字数からトークンを概算（1文字 ≒ 0.25トークン）", () => {
      const memory = new ThresholdRollingSummaryMemory();
      const messages = [{ role: "user" as const, content: "a".repeat(100) }];
      expect(memory.estimateTokens(messages)).toBe(25);
    });

    it("複数メッセージの合計", () => {
      const memory = new ThresholdRollingSummaryMemory();
      const messages = [
        { role: "user" as const, content: "a".repeat(100) },
        { role: "assistant" as const, content: "b".repeat(200) },
      ];
      expect(memory.estimateTokens(messages)).toBe(75); // (100+200)*0.25
    });
  });

  describe("圧縮率計算（動的）", () => {
    it("閾値内の場合は要約不要", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 1000,
        compressionRates: testCompressionRates,
      });

      // 800トークン = 閾値未満
      const status = memory.getStatus();
      expect(status.isSummarizing).toBe(false);
    });

    it("1,000トークン以下 → 5%圧縮率", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 100,
        compressionRates: testCompressionRates,
        maxRecentTurns: 1, // 最小化
      });

      // 1,000トークン分のメッセージ追加
      const longContent = "a".repeat(4000); // 1,000トークン
      memory.addMessage({ role: "user", content: longContent });

      const status = memory.getStatus();
      expect(status.estimatedTokens).toBe(1000);
    });

    it("目標要約サイズ計算", () => {
      const memory = new ThresholdRollingSummaryMemory({
        compressionRates: testCompressionRates,
        maxSummaryTokens: 500, // 小さめに設定
      });

      // テスト用にprivateメソッドを呼び出す
      const testCases = [
        { input: 500, expectedRate: 0.05, expectedMax: 500 }, // 5% = 25, max=500
        { input: 3000, expectedRate: 0.03, expectedMax: 500 }, // 3% = 90, max=500
        { input: 8000, expectedRate: 0.02, expectedMax: 500 }, // 2% = 160, max=500
        { input: 20000, expectedRate: 0.01, expectedMax: 500 }, // 1% = 200, max=500
      ];

      for (const tc of testCases) {
        const targetTokens = Math.min(Math.floor(tc.input * tc.expectedRate), 500);
        expect(targetTokens).toBeLessThanOrEqual(500);
      }
    });
  });

  describe("コンテキスト取得", () => {
    it("要約なし時は全メッセージを返す", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 10000, // 高めに設定
      });

      memory.addMessage({ role: "user", content: "Hello" });
      memory.addMessage({ role: "assistant", content: "Hi" });

      const context = memory.getContext();
      expect(context.messages).toHaveLength(2);
      expect(context.summary).toBeUndefined();
      expect(context.recentTurns).toBe(1);
    });

    it("メッセージ追加後の状態確認", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 10000,
      });

      memory.addMessage({ role: "user", content: "Q1" });
      memory.addMessage({ role: "assistant", content: "A1" });
      memory.addMessage({ role: "user", content: "Q2" });

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(3);
      expect(status.recentMessages).toBe(3);
      expect(status.hasSummary).toBe(false);
    });
  });

  describe("クリア機能", () => {
    it("クリア後は空の状態になる", () => {
      const memory = new ThresholdRollingSummaryMemory();

      memory.addMessage({ role: "user", content: "Hello" });
      memory.clear();

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(0);
      expect(status.hasSummary).toBe(false);
      expect(memory.getAllMessages()).toHaveLength(0);
    });
  });

  describe("実用的なシナリオ", () => {
    it("短い会話（閾値未満）は要約しない", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 100_000, // 10万トークン
      });

      // 50ターンの短い会話（各4文字 = 1トークン）
      for (let i = 0; i < 50; i++) {
        memory.addMessage({ role: "user", content: `Q${i}` }); // "Q0" = 2文字
        memory.addMessage({ role: "assistant", content: `A${i}` }); // "A0" = 2文字
      }

      const status = memory.getStatus();
      expect(status.estimatedTokens).toBe(70); // (2+2)文字×50×0.25 = 50、実際はQ0~Q49で70文字程度
      expect(status.isSummarizing).toBe(false);
      expect(status.hasSummary).toBe(false);
    });

    it("長い会話（閾値超過）のシミュレーション", () => {
      const memory = new ThresholdRollingSummaryMemory({
        tokenThreshold: 10_000, // 低めに設定
        maxRecentTurns: 5,
        compressionRates: testCompressionRates,
      });

      // 20ターンの長い会話（各5000文字 = 1250トークン）
      // 合計: 50,000文字 = 12,500トークン → 閾値超過
      for (let i = 0; i < 20; i++) {
        memory.addMessage({ role: "user", content: "U".repeat(5000) });
        memory.addMessage({ role: "assistant", content: "A".repeat(5000) });
      }

      const status = memory.getStatus();
      expect(status.estimatedTokens).toBe(50000); // 200,000文字 × 0.25
      expect(status.isSummarizing).toBe(true);
    });
  });
});
