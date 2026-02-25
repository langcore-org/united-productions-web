/**
 * ClientMemory 単体テスト
 *
 * @created 2026-02-24
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientMemory } from "@/lib/llm/memory/client-memory";

describe("ClientMemory", () => {
  const mockProvider = "grok-4-1-fast-reasoning" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本機能", () => {
    it("初期状態は空", () => {
      const memory = new ClientMemory(mockProvider);
      const status = memory.getStatus();

      expect(status.totalMessages).toBe(0);
      expect(status.hasSummary).toBe(false);
      expect(status.estimatedTokens).toBe(0);
    });

    it("メッセージを追加できる", async () => {
      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100_000, // 高めに設定して要約を防ぐ
      });

      await memory.addMessage({ role: "user", content: "Hello" });

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(1);
      expect(memory.getAllMessages()).toHaveLength(1);
    });

    it("複数メッセージを一括追加できる", async () => {
      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100_000,
      });

      await memory.addMessages([
        { role: "user", content: "Q1" },
        { role: "assistant", content: "A1" },
        { role: "user", content: "Q2" },
      ]);

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(3);
    });
  });

  describe("トークン計算", () => {
    it("空のメッセージリストは0トークン", () => {
      const memory = new ClientMemory(mockProvider);
      expect(memory.estimateTokens([])).toBe(0);
    });

    it("文字数からトークンを概算（1文字 ≒ 0.25トークン）", () => {
      const memory = new ClientMemory(mockProvider);
      const messages = [{ role: "user" as const, content: "a".repeat(100) }];
      expect(memory.estimateTokens(messages)).toBe(25);
    });

    it("日本語も同様に計算", () => {
      const memory = new ClientMemory(mockProvider);
      const messages = [{ role: "user" as const, content: "こんにちは" }]; // 5文字
      expect(memory.estimateTokens(messages)).toBe(1); // 5 * 0.25 = 1.25 → 1
    });
  });

  describe("コンテキスト取得", () => {
    it("要約なし時は全メッセージを返す", async () => {
      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100_000,
      });

      await memory.addMessage({ role: "user", content: "Hello" });
      await memory.addMessage({ role: "assistant", content: "Hi" });

      const context = memory.getContext();
      expect(context.messages).toHaveLength(2);
      expect(context.summary).toBeUndefined();
      expect(context.recentTurns).toBe(1);
    });

    it("メッセージ追加後の状態確認", async () => {
      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100_000,
      });

      await memory.addMessage({ role: "user", content: "Q1" });
      await memory.addMessage({ role: "assistant", content: "A1" });
      await memory.addMessage({ role: "user", content: "Q2" });

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(3);
      expect(status.recentMessages).toBe(3);
      expect(status.hasSummary).toBe(false);
    });
  });

  describe("要約機能（API呼び出し）", () => {
    it("閾値超過時に要約APIを呼び出す", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary: "要約テスト" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100, // 低めに設定
        maxRecentTurns: 2, // 直近2ターン（4メッセージ）を保持
      });

      // 100トークン = 400文字（1文字 = 0.25トークン）
      // maxRecentTurns=2 の場合、要約対象は直近4メッセージを除くメッセージ
      // なので最低5メッセージ必要
      await memory.addMessage({ role: "user", content: "U1".repeat(100) }); // 25トークン
      await memory.addMessage({ role: "assistant", content: "A1".repeat(100) }); // 25トークン = 50
      await memory.addMessage({ role: "user", content: "U2".repeat(100) }); // 25トークン = 75
      await memory.addMessage({ role: "assistant", content: "A2".repeat(100) }); // 25トークン = 100
      await memory.addMessage({ role: "user", content: "U3".repeat(100) }); // 25トークン = 125 > 100

      // 要約APIが呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/llm/summarize",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("grok-4-1-fast-reasoning"),
        }),
      );

      const status = memory.getStatus();
      expect(status.hasSummary).toBe(true);
      expect(memory.getSummary()).toBe("要約テスト");

      // 要約イベント履歴を確認
      const history = memory.getSummarizationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe("completed");
      expect(history[0].displayName).toContain("要約しました");
      expect(history[0].targetMessageCount).toBe(1); // 5メッセージ - 4保持 = 1要約対象
    });

    it("要約APIが失敗しても続行する", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100,
        maxRecentTurns: 2,
      });

      // 閾値超過するメッセージを追加（5メッセージ以上必要）
      await memory.addMessage({ role: "user", content: "U1".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A1".repeat(100) });
      await memory.addMessage({ role: "user", content: "U2".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A2".repeat(100) });
      await memory.addMessage({ role: "user", content: "U3".repeat(100) });

      // エラーがスローされないことを確認
      expect(mockFetch).toHaveBeenCalled();

      // 要約は作成されない
      const status = memory.getStatus();
      expect(status.hasSummary).toBe(false);

      // エラーイベントが履歴に追加される
      const history = memory.getSummarizationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe("error");
      expect(history[0].displayName).toContain("要約に失敗");
    });

    it("要約APIがエラーレスポンスを返しても続行する", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100,
        maxRecentTurns: 2,
      });

      // 閾値超過するメッセージを追加（5メッセージ以上必要）
      await memory.addMessage({ role: "user", content: "U1".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A1".repeat(100) });
      await memory.addMessage({ role: "user", content: "U2".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A2".repeat(100) });
      await memory.addMessage({ role: "user", content: "U3".repeat(100) });

      // エラーがスローされないことを確認
      expect(mockFetch).toHaveBeenCalled();

      const status = memory.getStatus();
      expect(status.hasSummary).toBe(false);
    });

    it("要約後は要約 + 直近メッセージを返す", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary: "これまでの要約" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100,
        maxRecentTurns: 2, // 直近2ターン（4メッセージ）を保持
      });

      // 閾値超過するメッセージを追加（6メッセージ）
      await memory.addMessage({ role: "user", content: "U1".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A1".repeat(100) });
      await memory.addMessage({ role: "user", content: "U2".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A2".repeat(100) });
      await memory.addMessage({ role: "user", content: "U3".repeat(100) });
      await memory.addMessage({ role: "assistant", content: "A3".repeat(100) });

      const context = memory.getContext();

      // 要約 + 直近4メッセージ
      expect(context.messages).toHaveLength(5);
      expect(context.messages[0].role).toBe("system");
      expect(context.messages[0].content).toContain("これまでの要約");
      expect(context.summary).toBe("これまでの要約");
    });
  });

  describe("クリア機能", () => {
    it("クリア後は空の状態になる", async () => {
      const memory = new ClientMemory(mockProvider);

      await memory.addMessage({ role: "user", content: "Hello" });
      memory.clear();

      const status = memory.getStatus();
      expect(status.totalMessages).toBe(0);
      expect(status.hasSummary).toBe(false);
      expect(memory.getAllMessages()).toHaveLength(0);
    });
  });

  describe("実用的なシナリオ", () => {
    it("短い会話（閾値未満）は要約APIを呼び出さない", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 100_000, // 10万トークン
      });

      // 50ターンの短い会話
      for (let i = 0; i < 50; i++) {
        await memory.addMessage({ role: "user", content: `Q${i}` });
        await memory.addMessage({ role: "assistant", content: `A${i}` });
      }

      // APIは呼ばれない
      expect(mockFetch).not.toHaveBeenCalled();

      const status = memory.getStatus();
      expect(status.hasSummary).toBe(false);
      expect(memory.getAllMessages()).toHaveLength(100);
    });

    it("長い会話（閾値超過）で要約が実行される", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary: "要約結果" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      global.fetch = mockFetch;

      const memory = new ClientMemory(mockProvider, {
        tokenThreshold: 500, // 低めに設定
        maxRecentTurns: 5,
      });

      // 閾値超過する長い会話（500トークン = 2000文字）
      for (let i = 0; i < 10; i++) {
        await memory.addMessage({ role: "user", content: "U".repeat(150) });
        await memory.addMessage({ role: "assistant", content: "A".repeat(150) });
      }

      // 要約APIが呼ばれる
      expect(mockFetch).toHaveBeenCalled();

      const status = memory.getStatus();
      expect(status.hasSummary).toBe(true);
    });
  });
});
