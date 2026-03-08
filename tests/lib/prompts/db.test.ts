import { beforeEach, describe, expect, it, vi } from "vitest";

// Prismaモジュールのモック（ファクトリ関数内で定義）
vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    systemPrompt: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    systemPromptVersion: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

// モック後にインポート
import { prisma } from "@/lib/prisma";
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

const mockPrisma = prisma as unknown as {
  systemPrompt: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  systemPromptVersion: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("プロンプトDBユーティリティ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPromptFromDB", () => {
    it("プロンプトを正常に取得できる", async () => {
      const mockPrompt = { content: "テストプロンプト内容" };
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(mockPrompt);

      const result = await getPromptFromDB("TEST_KEY");

      expect(result).toBe("テストプロンプト内容");
      expect(mockPrisma.systemPrompt.findUnique).toHaveBeenCalledWith({
        where: { key: "TEST_KEY" },
      });
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(null);

      const result = await getPromptFromDB("NON_EXISTENT");

      expect(result).toBeNull();
    });

    it("エラー時はnullを返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockRejectedValue(new Error("DBエラー"));

      const result = await getPromptFromDB("TEST_KEY");

      expect(result).toBeNull();
    });
  });

  describe("getPromptsFromDB", () => {
    it("複数のプロンプトを一括取得できる", async () => {
      const mockPrompts = [
        { key: "KEY1", content: "内容1" },
        { key: "KEY2", content: "内容2" },
      ];
      mockPrisma.systemPrompt.findMany.mockResolvedValue(mockPrompts);

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
      const mockPrompts = [{ id: "1", key: "MINUTES", name: "議事録", category: "minutes" }];
      mockPrisma.systemPrompt.findMany.mockResolvedValue(mockPrompts);

      const result = await getPromptsByCategory("minutes");

      expect(result).toEqual(mockPrompts);
      expect(mockPrisma.systemPrompt.findMany).toHaveBeenCalledWith({
        where: { category: "minutes", isActive: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("getAllPrompts", () => {
    it("全プロンプトを取得できる", async () => {
      const mockPrompts = [
        { id: "1", key: "MINUTES", category: "minutes" },
        { id: "2", key: "TRANSCRIPT", category: "transcript" },
      ];
      mockPrisma.systemPrompt.findMany.mockResolvedValue(mockPrompts);

      const result = await getAllPrompts();

      expect(result).toEqual(mockPrompts);
    });
  });

  describe("getPromptWithFallback", () => {
    it("DBから取得できた場合はDBの値を返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue({ content: "DBの内容" });

      const result = await getPromptWithFallback("KEY", "フォールバック");

      expect(result).toBe("DBの内容");
    });

    it("DBから取得できない場合はフォールバック値を返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(null);

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
    vi.clearAllMocks();
  });

  describe("updatePromptWithVersion", () => {
    it("プロンプトを更新し、新しいバージョンを作成する", async () => {
      const currentPrompt = {
        id: "prompt-1",
        key: "TEST_KEY",
        currentVersion: 2,
        content: "旧内容",
      };
      const updatedPrompt = {
        ...currentPrompt,
        currentVersion: 3,
        content: "新内容",
        changedBy: "user-1",
        changeNote: "テスト更新",
      };

      mockPrisma.systemPrompt.findUnique.mockResolvedValue(currentPrompt);
      mockPrisma.systemPromptVersion.create.mockResolvedValue({ id: "version-3" });
      mockPrisma.systemPrompt.update.mockResolvedValue(updatedPrompt);

      const result = await updatePromptWithVersion("TEST_KEY", "新内容", "user-1", "テスト更新");

      expect(result.currentVersion).toBe(3);
      expect(result.content).toBe("新内容");
      expect(mockPrisma.systemPromptVersion.create).toHaveBeenCalledWith({
        data: {
          promptId: "prompt-1",
          version: 3,
          content: "新内容",
          changedBy: "user-1",
          changeNote: "テスト更新",
        },
      });
    });

    it("プロンプトが見つからない場合はエラーを投げる", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(null);

      await expect(updatePromptWithVersion("NON_EXISTENT", "内容")).rejects.toThrow(
        "Prompt not found: NON_EXISTENT",
      );
    });
  });

  describe("getPromptVersionHistory", () => {
    it("バージョン履歴を取得できる", async () => {
      const mockPrompt = {
        id: "prompt-1",
        versions: [
          { version: 3, content: "内容3" },
          { version: 2, content: "内容2" },
          { version: 1, content: "内容1" },
        ],
      };
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(mockPrompt);

      const result = await getPromptVersionHistory("TEST_KEY");

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
    });
  });

  describe("getPromptVersion", () => {
    it("特定バージョンを取得できる", async () => {
      const mockPrompt = { id: "prompt-1" };
      const mockVersion = { version: 2, content: "内容2" };

      mockPrisma.systemPrompt.findUnique.mockResolvedValue(mockPrompt);
      mockPrisma.systemPromptVersion.findFirst.mockResolvedValue(mockVersion);

      const result = await getPromptVersion("TEST_KEY", 2);

      expect(result).toEqual(mockVersion);
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(null);

      const result = await getPromptVersion("NON_EXISTENT", 1);

      expect(result).toBeNull();
    });
  });

  describe("restorePromptVersion", () => {
    it("指定バージョンに復元し、新バージョンとして記録する", async () => {
      const currentPrompt = {
        id: "prompt-1",
        key: "TEST_KEY",
        currentVersion: 3,
      };
      const targetVersion = {
        version: 2,
        content: "復元元の内容",
      };
      const restoredPrompt = {
        ...currentPrompt,
        currentVersion: 4,
        content: "復元元の内容",
        changeNote: "バージョン2から復元",
      };

      mockPrisma.systemPrompt.findUnique.mockResolvedValue(currentPrompt);
      mockPrisma.systemPromptVersion.findFirst.mockResolvedValue(targetVersion);
      mockPrisma.systemPromptVersion.create.mockResolvedValue({ id: "version-4" });
      mockPrisma.systemPrompt.update.mockResolvedValue(restoredPrompt);

      const result = await restorePromptVersion("TEST_KEY", 2, "user-1", "問題があったため戻す");

      expect(result.currentVersion).toBe(4);
      expect(result.content).toBe("復元元の内容");
      expect(mockPrisma.systemPromptVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 4,
          content: "復元元の内容",
          changeNote: "問題があったため戻す（バージョン2から復元）",
        }),
      });
    });

    it("復元元バージョンが見つからない場合はエラーを投げる", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue({ id: "prompt-1" });
      mockPrisma.systemPromptVersion.findFirst.mockResolvedValue(null);

      await expect(restorePromptVersion("TEST_KEY", 999)).rejects.toThrow(
        "Version 999 not found for prompt: TEST_KEY",
      );
    });
  });

  describe("getPromptWithHistory", () => {
    it("プロンプト詳細とバージョン履歴を取得できる", async () => {
      const mockPrompt = {
        id: "prompt-1",
        key: "TEST_KEY",
        name: "テストプロンプト",
        versions: [
          { version: 2, content: "内容2", changeNote: "更新2" },
          { version: 1, content: "内容1", changeNote: "初期" },
        ],
      };
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(mockPrompt);

      const result = await getPromptWithHistory("TEST_KEY");

      expect(result).toEqual(mockPrompt);
      expect(result?.versions).toHaveLength(2);
    });

    it("プロンプトが見つからない場合はnullを返す", async () => {
      mockPrisma.systemPrompt.findUnique.mockResolvedValue(null);

      const result = await getPromptWithHistory("NON_EXISTENT");

      expect(result).toBeNull();
    });
  });
});
