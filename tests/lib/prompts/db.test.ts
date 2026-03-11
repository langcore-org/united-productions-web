import { beforeEach, describe, expect, it, vi } from "vitest";

const responseQueue: { data: unknown; error: Error | null }[] = [];

function makeChain() {
  return {
    eq: (col?: string, val?: unknown) => ({
      single: () => Promise.resolve(responseQueue.shift() ?? { data: null, error: null }),
      eq: () => ({
        single: () => Promise.resolve(responseQueue.shift() ?? { data: null, error: null }),
        order: () => Promise.resolve(responseQueue.shift() ?? { data: [], error: null }),
      }),
      order: () => Promise.resolve(responseQueue.shift() ?? { data: [], error: null }),
    }),
    in: () => Promise.resolve(responseQueue.shift() ?? { data: [], error: null }),
    order: () => ({
      order: () => Promise.resolve(responseQueue.shift() ?? { data: [], error: null }),
    }),
    single: () => Promise.resolve(responseQueue.shift() ?? { data: null, error: null }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: () => ({
        select: () => makeChain(),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve(responseQueue.shift() ?? { data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  ),
}));

import {
  getAllPrompts,
  getPromptFromDB,
  getPromptsByCategory,
  getPromptsFromDB,
  getPromptVersion,
  getPromptVersionHistory,
  getPromptWithFallback,
  getPromptWithHistory,
  PROMPT_CATEGORIES,
  PROMPT_KEYS,
  restorePromptVersion,
  updatePromptWithVersion,
} from "@/lib/prompts";

describe("プロンプトDBユーティリティ", () => {
  beforeEach(() => {
    responseQueue.length = 0;
  });

  describe("getPromptFromDB", () => {
    it("プロンプトを正常に取得できる", async () => {
      responseQueue.push({ data: { content: "テストプロンプト内容" }, error: null });

      const result = await getPromptFromDB("TEST_KEY");

      expect(result).toBe("テストプロンプト内容");
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      responseQueue.push({ data: null, error: null });

      const result = await getPromptFromDB("NON_EXISTENT");

      expect(result).toBeNull();
    });

    it("エラー時はnullを返す", async () => {
      responseQueue.push({ data: null, error: new Error("DBエラー") });

      const result = await getPromptFromDB("TEST_KEY");

      expect(result).toBeNull();
    });
  });

  describe("getPromptsFromDB", () => {
    it("複数のプロンプトを一括取得できる", async () => {
      responseQueue.push({
        data: [
          { key: "KEY1", content: "内容1" },
          { key: "KEY2", content: "内容2" },
        ],
        error: null,
      });

      const result = await getPromptsFromDB(["KEY1", "KEY2", "KEY3"]);

      expect(result).toEqual({
        KEY1: "内容1",
        KEY2: "内容2",
        KEY3: null,
      });
    });
  });

  describe("getPromptsByCategory", () => {
    it("カテゴリ別にプロンプトを取得できる", async () => {
      responseQueue.push({
        data: [{ id: "1", key: "MINUTES", name: "議事録", category: "minutes" }],
        error: null,
      });

      const result = await getPromptsByCategory("minutes");

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("MINUTES");
    });
  });

  describe("getAllPrompts", () => {
    it("全プロンプトを取得できる", async () => {
      responseQueue.push({
        data: [
          { id: "1", key: "MINUTES", category: "minutes" },
          { id: "2", key: "TRANSCRIPT", category: "transcript" },
        ],
        error: null,
      });

      const result = await getAllPrompts();

      expect(result).toHaveLength(2);
    });
  });

  describe("getPromptWithFallback", () => {
    it("DBから取得できた場合はDBの値を返す", async () => {
      responseQueue.push({ data: { content: "DBの内容" }, error: null });

      const result = await getPromptWithFallback("KEY", "フォールバック");

      expect(result).toBe("DBの内容");
    });

    it("DBから取得できない場合はフォールバック値を返す", async () => {
      responseQueue.push({ data: null, error: null });

      const result = await getPromptWithFallback("KEY", "フォールバック");

      expect(result).toBe("フォールバック");
    });
  });

  describe("PROMPT_KEYS", () => {
    it("必要なキーが定義されている", () => {
      expect(PROMPT_KEYS.GENERAL_CHAT).toBe("GENERAL_CHAT");
      expect(PROMPT_KEYS.MINUTES).toBe("MINUTES");
      expect(PROMPT_KEYS.TRANSCRIPT).toBe("TRANSCRIPT");
      expect(PROMPT_KEYS.RESEARCH_CAST).toBe("RESEARCH_CAST");
      expect(PROMPT_KEYS.PROPOSAL).toBe("PROPOSAL");
    });
  });

  describe("PROMPT_CATEGORIES", () => {
    it("カテゴリが正しく定義されている", () => {
      expect(PROMPT_CATEGORIES.general).toBe("一般");
      expect(PROMPT_CATEGORIES.minutes).toBe("議事録");
      expect(PROMPT_CATEGORIES.transcript).toBe("起こし・NA");
      expect(PROMPT_CATEGORIES.research).toBe("リサーチ");
      expect(PROMPT_CATEGORIES.document).toBe("ドキュメント");
    });
  });
});

describe("バージョン管理機能", () => {
  beforeEach(() => {
    responseQueue.length = 0;
  });

  describe("updatePromptWithVersion", () => {
    it("プロンプトを更新し、新しいバージョンを作成する", async () => {
      responseQueue.push({
        data: {
          id: "prompt-1",
          key: "TEST_KEY",
          current_version: 2,
          content: "旧内容",
        },
        error: null,
      });
      responseQueue.push({
        data: {
          id: "prompt-1",
          key: "TEST_KEY",
          current_version: 3,
          content: "新内容",
          change_note: "テスト更新",
        },
        error: null,
      });

      const result = await updatePromptWithVersion("TEST_KEY", "新内容", "user-1", "テスト更新");

      expect(result.current_version).toBe(3);
      expect(result.content).toBe("新内容");
    });

    it("プロンプトが見つからない場合はエラーを投げる", async () => {
      responseQueue.push({ data: null, error: null });

      await expect(updatePromptWithVersion("NON_EXISTENT", "内容")).rejects.toThrow(
        "Prompt not found: NON_EXISTENT",
      );
    });
  });

  describe("getPromptVersionHistory", () => {
    it("バージョン履歴を取得できる", async () => {
      responseQueue.push({ data: { id: "prompt-1" }, error: null });
      responseQueue.push({
        data: [
          { version: 3, content: "内容3" },
          { version: 2, content: "内容2" },
          { version: 1, content: "内容1" },
        ],
        error: null,
      });

      const result = await getPromptVersionHistory("TEST_KEY");

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
    });
  });

  describe("getPromptVersion", () => {
    it("特定バージョンを取得できる", async () => {
      responseQueue.push({ data: { id: "prompt-1" }, error: null });
      responseQueue.push({ data: { version: 2, content: "内容2" }, error: null });

      const result = await getPromptVersion("TEST_KEY", 2);

      expect(result?.version).toBe(2);
      expect(result?.content).toBe("内容2");
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      responseQueue.push({ data: null, error: null });

      const result = await getPromptVersion("NON_EXISTENT", 1);

      expect(result).toBeNull();
    });
  });

  describe("restorePromptVersion", () => {
    it("指定バージョンに復元し、新バージョンとして記録する", async () => {
      responseQueue.push({
        data: { id: "prompt-1", key: "TEST_KEY", current_version: 3 },
        error: null,
      });
      responseQueue.push({
        data: { version: 2, content: "復元元の内容" },
        error: null,
      });
      responseQueue.push({ data: { id: "version-4" }, error: null });
      responseQueue.push({
        data: {
          id: "prompt-1",
          key: "TEST_KEY",
          current_version: 4,
          content: "復元元の内容",
          change_note: "バージョン2から復元",
        },
        error: null,
      });

      const result = await restorePromptVersion("TEST_KEY", 2, "user-1", "問題があったため戻す");

      expect(result.current_version).toBe(4);
      expect(result.content).toBe("復元元の内容");
    });

    it("復元元バージョンが見つからない場合はエラーを投げる", async () => {
      responseQueue.push({ data: { id: "prompt-1" }, error: null });
      responseQueue.push({ data: null, error: null });

      await expect(restorePromptVersion("TEST_KEY", 999)).rejects.toThrow(
        "Version 999 not found for prompt: TEST_KEY",
      );
    });
  });

  describe("getPromptWithHistory", () => {
    it("プロンプト詳細とバージョン履歴を取得できる", async () => {
      responseQueue.push({
        data: { id: "prompt-1", key: "TEST_KEY", name: "テストプロンプト" },
        error: null,
      });
      responseQueue.push({
        data: [
          { version: 2, content: "内容2", change_note: "更新2" },
          { version: 1, content: "内容1", change_note: "初期" },
        ],
        error: null,
      });

      const result = await getPromptWithHistory("TEST_KEY");

      expect(result).not.toBeNull();
      expect(result?.versions).toHaveLength(2);
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      responseQueue.push({ data: null, error: null });

      const result = await getPromptWithHistory("NON_EXISTENT");

      expect(result).toBeNull();
    });
  });
});
