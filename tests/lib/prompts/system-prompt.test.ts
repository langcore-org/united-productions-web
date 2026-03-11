/**
 * システムプロンプト構築のテスト（Supabaseモック版）
 */

import { describe, expect, it, vi } from "vitest";
import { buildProgramPrompt, buildSystemPrompt } from "@/lib/prompts/system-prompt";

const mockSupabaseState: {
  feature_prompts: { data: unknown; error: Error | null } | null;
  system_prompts: { data: unknown; error: Error | null } | null;
} = {
  feature_prompts: null,
  system_prompts: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve(
                table === "feature_prompts"
                  ? (mockSupabaseState.feature_prompts ?? { data: null, error: null })
                  : table === "system_prompts"
                    ? (mockSupabaseState.system_prompts ?? { data: null, error: null })
                    : { data: null, error: null },
              ),
            eq: () => ({
              single: () =>
                Promise.resolve(
                  table === "feature_prompts"
                    ? (mockSupabaseState.feature_prompts ?? { data: null, error: null })
                    : { data: null, error: null },
                ),
            }),
          }),
        }),
      }),
    }),
  ),
}));

describe("buildProgramPrompt", () => {
  it("全番組のプロンプトを構築できる", () => {
    const prompt = buildProgramPrompt("all");

    expect(prompt).toContain("レギュラー番組一覧");
    expect(prompt).toContain("マツコの知らない世界");
    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("前提知識として保持");
  });

  it("特定番組のプロンプトを構築できる", () => {
    const prompt = buildProgramPrompt("shikujiri");

    expect(prompt).toContain("しくじり先生 俺みたいになるな!!");
    expect(prompt).toContain("ギャル曽根");
    expect(prompt).toContain("前提知識として保持");
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

    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("前提知識として保持");
    expect(prompt).not.toContain("機能固有の指示");
  });

  it.skip("featureIdありで機能プロンプトを結合", async () => {
    mockSupabaseState.feature_prompts = {
      data: {
        id: "fp-1",
        feature_id: "research-cast",
        prompt_key: "RESEARCH_CAST",
        is_active: true,
      },
      error: null,
    };
    mockSupabaseState.system_prompts = {
      data: {
        id: "sp-1",
        key: "RESEARCH_CAST",
        content: "## 出演者リサーチ\n\nあなたは出演者リサーチ専門家です。",
        is_active: true,
      },
      error: null,
    };

    const prompt = await buildSystemPrompt("shikujiri", "research-cast");

    expect(prompt).toContain("しくじり先生");
    expect(prompt).toContain("出演者リサーチ");
  });

  it("存在しないfeatureIdの場合は番組情報のみ", async () => {
    mockSupabaseState.feature_prompts = { data: null, error: null };

    const prompt = await buildSystemPrompt("shikujiri", "non-existent");

    expect(prompt).toContain("しくじり先生");
    expect(prompt).not.toContain("機能固有の指示");
  });

  it("DBエラー時は番組情報のみを返す", async () => {
    mockSupabaseState.feature_prompts = { data: null, error: new Error("DB Error") };

    const prompt = await buildSystemPrompt("shikujiri", "research-cast");

    expect(prompt).toContain("しくじり先生");
    expect(prompt).not.toContain("機能固有の指示");
  });
});
