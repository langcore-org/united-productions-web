/**
 * GrokClient 単体テスト
 *
 * @created 2026-02-24
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// 環境変数モック
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, XAI_API_KEY: "test-api-key" };
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

import { GrokClient } from "@/lib/llm/clients/grok";

describe("GrokClient", () => {
  describe("constructor", () => {
    it("XAI_API_KEY がない場合はエラー", () => {
      delete process.env.XAI_API_KEY;
      expect(() => new GrokClient("grok-4-1-fast-reasoning")).toThrow(
        "XAI_API_KEY environment variable is not set",
      );
    });

    it("有効な provider でインスタンス化", () => {
      const client = new GrokClient("grok-4-1-fast-reasoning");
      expect(client).toBeDefined();
    });
  });

  describe("summarize", () => {
    it("要約プロンプトを正しく構築", async () => {
      const client = new GrokClient("grok-4-1-fast-reasoning");

      // fetch をモック
      const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "test-id",
            object: "response",
            created: Date.now(),
            completed_at: Date.now(),
            model: "grok-4-1-fast-reasoning",
            output: [
              {
                type: "message",
                content: [{ type: "text", text: "要約結果" }],
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
          { status: 200 },
        ),
      );

      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there" },
      ];

      const result = await client.summarize(messages);

      expect(result).toBe("要約結果");
      expect(mockFetch).toHaveBeenCalled();

      // リクエストボディを検証
      const callArgs = mockFetch.mock.calls[0];
      const url = callArgs[0];
      const options = callArgs[1];
      const requestBody = JSON.parse(options.body);

      expect(url).toBe("https://api.x.ai/v1/responses");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toContain("Bearer");
      expect(requestBody.model).toBe("grok-4-1-fast-reasoning");
      expect(requestBody.input).toHaveLength(2);
      expect(requestBody.input[0].role).toBe("system");
      expect(requestBody.input[0].content).toContain("要約");
      expect(requestBody.input[1].role).toBe("user");
      expect(requestBody.input[1].content).toContain("Hello");
      expect(requestBody.input[1].content).toContain("Hi there");

      mockFetch.mockRestore();
    });

    it("空のメッセージリストでも動作", async () => {
      const client = new GrokClient("grok-4-1-fast-reasoning");

      const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "test-id",
            object: "response",
            created: Date.now(),
            completed_at: Date.now(),
            model: "grok-4-1-fast-reasoning",
            output: [
              {
                type: "message",
                content: [{ type: "text", text: "" }],
              },
            ],
            usage: { input_tokens: 10, output_tokens: 0 },
          }),
          { status: 200 },
        ),
      );

      const result = await client.summarize([]);
      expect(result).toBe("");

      mockFetch.mockRestore();
    });

    it("API エラーの場合は例外をスロー", async () => {
      const client = new GrokClient("grok-4-1-fast-reasoning");

      const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      );

      const messages = [{ role: "user" as const, content: "Hello" }];

      await expect(client.summarize(messages)).rejects.toThrow();

      mockFetch.mockRestore();
    });

    it("長い会話の要約", async () => {
      const client = new GrokClient("grok-4-1-fast-reasoning");

      const mockFetch = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "test-id",
            object: "response",
            created: Date.now(),
            completed_at: Date.now(),
            model: "grok-4-1-fast-reasoning",
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "text",
                    text: "ユーザーとアシスタントがプロジェクトについて議論しました。",
                  },
                ],
              },
            ],
            usage: { input_tokens: 1000, output_tokens: 100 },
          }),
          { status: 200 },
        ),
      );

      const messages = [
        { role: "user", content: "プロジェクトの進捗は？" },
        { role: "assistant", content: "順調です。設計が完了しました。" },
        { role: "user", content: "次のステップは？" },
        { role: "assistant", content: "実装フェーズに入ります。" },
      ];

      const result = await client.summarize(messages);

      expect(result).toContain("議論");
      expect(mockFetch).toHaveBeenCalled();

      // リクエストボディを検証
      const callArgs = mockFetch.mock.calls[0];
      const options = callArgs[1];
      const requestBody = JSON.parse(options.body);
      const userMessage = requestBody.input[1];

      expect(userMessage.role).toBe("user");
      expect(userMessage.content).toContain("プロジェクトの進捗");
      expect(userMessage.content).toContain("順調です");
      expect(userMessage.content).toContain("次のステップ");
      expect(userMessage.content).toContain("実装フェーズ");

      mockFetch.mockRestore();
    });
  });
});
