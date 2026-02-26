/**
 * useLLMStream Hook テスト
 *
 * フォローアップ非同期化の動作を検証
 *
 * @created 2026-02-25
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLLMStream } from "@/hooks/useLLMStream";

// =============================================================================
// モック
// =============================================================================

const mockStreamLLMResponse = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/api/llm-client", () => ({
  streamLLMResponse: (...args: unknown[]) => mockStreamLLMResponse(...args),
  LLMApiError: class LLMApiError extends Error {
    constructor(
      message: string,
      public readonly status?: number,
      public readonly serverRequestId?: string,
    ) {
      super(message);
      this.name = "LLMApiError";
    }
  },
}));

global.fetch = mockFetch;

// =============================================================================
// テストデータ
// =============================================================================

const createMockStream = (events: Array<{ type: string; [key: string]: unknown }>) => {
  return async function* () {
    for (const event of events) {
      yield event;
    }
  };
};

// =============================================================================
// テスト
// =============================================================================

describe("useLLMStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("フォローアップ非同期化", () => {
    it("ストリーム完了後、フォローアップ生成を待たずに isComplete が true になる", async () => {
      // モック: ストリームイベント
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答内容" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      // モック: フォローアップAPI（遅延応答）
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ questions: ["質問1", "質問2"] }),
              });
            }, 1000); // 1秒遅延
          }),
      );

      const { result } = renderHook(() => useLLMStream());

      // ストリーム開始
      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // フォローアップAPIが呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledWith("/api/llm/follow-up", expect.any(Object));

      // isComplete が即座に true になっている（フォローアップ待ちでない）
      expect(result.current.isComplete).toBe(true);
      expect(result.current.content).toBe("回答内容");

      // フォローアップはまだローディング中
      expect(result.current.followUp.isLoading).toBe(true);
      expect(result.current.followUp.questions).toEqual([]);
    });

    it("フォローアップ生成完了後、questions が更新される", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: ["フォローアップ1", "フォローアップ2"] }),
      });

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // フォローアップ完了を待つ
      await waitFor(() => {
        expect(result.current.followUp.isLoading).toBe(false);
      });

      expect(result.current.followUp.questions).toEqual(["フォローアップ1", "フォローアップ2"]);
      expect(result.current.followUp.error).toBeNull();
    });

    it("フォローアップ生成失敗時も isComplete は true のまま", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // フォローアップエラー完了を待つ
      await waitFor(() => {
        expect(result.current.followUp.isLoading).toBe(false);
      });

      // isComplete は true のまま
      expect(result.current.isComplete).toBe(true);
      // フォローアップはエラー状態
      expect(result.current.followUp.error).toBe("Network error");
      expect(result.current.followUp.questions).toEqual([]);
    });

    it("ストリーム開始時、フォローアップ状態がリセットされる", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: ["フォローアップ"] }),
      });

      const { result } = renderHook(() => useLLMStream());

      // 1回目の送信
      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "質問1" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // 1回目のフォローアップ完了を待つ
      await waitFor(() => {
        expect(result.current.followUp.questions).toEqual(["フォローアップ"]);
      });

      // 2回目の送信（この時点でフォローアップ状態がリセットされる）
      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "質問2" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // 2回目の送信後、フォローアップはリセットされている
      expect(result.current.followUp.questions).toEqual([]);
      expect(result.current.followUp.error).toBeNull();
    });
  });

  describe("StreamPhase と isPending", () => {
    it("初期状態は phase=idle, isPending=false, isComplete=true", () => {
      const { result } = renderHook(() => useLLMStream());

      expect(result.current.phase).toBe("idle");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isComplete).toBe(true);
    });

    it("正常完了後は phase=complete, isPending=false", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: [] }),
      });

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      expect(result.current.phase).toBe("complete");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isComplete).toBe(true);
    });

    it("エラー時は phase=error, isPending=false", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([{ type: "start" }, { type: "error", message: "LLM error" }])(),
      );

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      expect(result.current.phase).toBe("error");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.error).toBe("LLM error");
    });

    it("キャンセル時は phase=cancelled, isPending=false", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([{ type: "start" }, { type: "content", delta: "部分的" }])(),
      );

      const { result } = renderHook(() => useLLMStream());

      act(() => {
        result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      act(() => {
        result.current.cancelStream();
      });

      expect(result.current.phase).toBe("cancelled");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isComplete).toBe(true);
    });

    it("resetStream 後は phase=idle に戻る", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: [] }),
      });

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      expect(result.current.phase).toBe("complete");

      act(() => {
        result.current.resetStream();
      });

      expect(result.current.phase).toBe("idle");
      expect(result.current.isPending).toBe(false);
    });

    it("isPending と isComplete は常に逆の値を持つ", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "done", usage: { inputTokens: 10, outputTokens: 5 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: [] }),
      });

      const { result } = renderHook(() => useLLMStream());

      // 初期状態
      expect(result.current.isPending).toBe(!result.current.isComplete);

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // 完了後
      expect(result.current.isPending).toBe(!result.current.isComplete);
    });
  });

  describe("基本動作", () => {
    it("ストリーム開始時、content がリセットされる", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([
          { type: "start" },
          { type: "content", delta: "新しい回答" },
          { type: "done", usage: { inputTokens: 100, outputTokens: 50 } },
        ])(),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ questions: [] }),
      });

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      expect(result.current.content).toBe("新しい回答");
    });

    it("エラー発生時、error が設定される", async () => {
      mockStreamLLMResponse.mockImplementation(() => {
        throw new Error("Stream error");
      });

      const { result } = renderHook(() => useLLMStream());

      await act(async () => {
        await result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      expect(result.current.error).toBe("Stream error");
      expect(result.current.isComplete).toBe(true);
    });

    it("キャンセル時、isComplete が true になる", async () => {
      mockStreamLLMResponse.mockReturnValue(
        createMockStream([{ type: "start" }, { type: "content", delta: "部分的" }])(),
      );

      const { result } = renderHook(() => useLLMStream());

      // ストリーム開始（完了しない）
      act(() => {
        result.current.startStream(
          [{ role: "user", content: "テスト" }],
          "grok-4-1-fast-reasoning",
        );
      });

      // キャンセル
      act(() => {
        result.current.cancelStream();
      });

      expect(result.current.isComplete).toBe(true);
    });
  });
});
