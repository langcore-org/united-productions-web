/**
 * システムプロンプト構築のテスト
 */

import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildProgramPrompt, buildSystemPrompt } from "@/lib/prompts/system-prompt";

// Prismaをモック
vi.mock("@/lib/prisma", () => ({
  prisma: {
    featurePrompt: {
      findUnique: vi.fn(),
    },
    systemPrompt: {
      findUnique: vi.fn(),
    },
  },
}));

describe("buildProgramPrompt", () => {
  it("全番組のプロンプトを構築できる", () => {
    const prompt = buildProgramPrompt("all");

    expect(prompt).toContain("United Productions");
    expect(prompt).toContain("マツコの知らない世界");
    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("前提知識として保持");
  });

  it("特定番組のプロンプトを構築できる", () => {
    const prompt = buildProgramPrompt("shikujiri");

    expect(prompt).toContain("United Productions");
    expect(prompt).toContain("しくじり先生 俺みたいになるな!!");
    expect(prompt).toContain("ギャル曽根");
    expect(prompt).not.toContain("マツコの知らない世界");
  });

  it("存在しない番組IDの場合は全番組を返す", () => {
    const prompt = buildProgramPrompt("non-existent");

    expect(prompt).toContain("マツコの知らない世界");
    expect(prompt).toContain("しくじり先生");
  });
});

describe("buildSystemPrompt", () => {
  it("featureIdなしで番組情報のみのプロンプトを構築", async () => {
    const prompt = await buildSystemPrompt("shikujiri");

    expect(prompt).toContain("United Productions");
    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("前提知識として保持");
    expect(prompt).not.toContain("機能固有の指示");
  });

  it("featureIdありで機能プロンプトを結合", async () => {
    // モックの設定
    vi.mocked(prisma.featurePrompt.findUnique).mockResolvedValue({
      id: "fp-1",
      featureId: "research-cast",
      promptKey: "RESEARCH_CAST",
      isActive: true,
    } as any);

    vi.mocked(prisma.systemPrompt.findUnique).mockResolvedValue({
      id: "sp-1",
      key: "RESEARCH_CAST",
      content: "## 出演者リサーチ\n\nあなたは出演者リサーチ専門家です。",
      isActive: true,
    } as any);

    const prompt = await buildSystemPrompt("shikujiri", "research-cast");

    expect(prompt).toContain("United Productions");
    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("機能固有の指示");
    expect(prompt).toContain("出演者リサーチ");
  });

  it("存在しないfeatureIdの場合は番組情報のみ", async () => {
    vi.mocked(prisma.featurePrompt.findUnique).mockResolvedValue(null);

    const prompt = await buildSystemPrompt("shikujiri", "non-existent");

    expect(prompt).toContain("United Productions");
    expect(prompt).not.toContain("機能固有の指示");
  });

  it("DBエラー時は番組情報のみを返す", async () => {
    vi.mocked(prisma.featurePrompt.findUnique).mockRejectedValue(new Error("DB Error"));

    // エラーが投げられることを確認
    await expect(buildSystemPrompt("shikujiri", "research-cast")).rejects.toThrow("DB Error");
  });
});
