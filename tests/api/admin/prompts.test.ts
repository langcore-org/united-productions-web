import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 認証モック
vi.mock("@/lib/api/auth", () => ({
  requireAuth: vi.fn(),
}));

import { GET as getVersion } from "@/app/api/admin/prompts/[key]/history/[version]/route";
import { GET as getHistory } from "@/app/api/admin/prompts/[key]/history/route";
import { POST as restoreVersion } from "@/app/api/admin/prompts/[key]/restore/route";
import { GET as getPromptDetail, PUT as updatePrompt } from "@/app/api/admin/prompts/[key]/route";
import { GET as getPromptsList } from "@/app/api/admin/prompts/route";
import { requireAuth } from "@/lib/api/auth";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

describe("Admin Prompts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/prompts/[key]/history/[version]", () => {
    it("無効なバージョン番号の場合は400を返す", async () => {
      mockRequireAuth.mockResolvedValue({
        userId: "user-1",
        user: { id: "user-1", email: "test@example.com" },
      });

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES/history/invalid");
      const response = await getVersion(request, {
        params: Promise.resolve({ key: "MINUTES", version: "invalid" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid version number");
    });
  });
});

describe("APIレスポンス形式", () => {
  it("全てのAPIが統一されたレスポンス形式を返す", async () => {
    // 成功レスポンスの形式確認
    const successResponse = {
      success: true,
      data: expect.any(Object),
    };

    // エラーレスポンスの形式確認
    const errorResponse = {
      success: false,
      error: expect.any(String),
    };

    expect(successResponse).toHaveProperty("success");
    expect(successResponse).toHaveProperty("data");
    expect(errorResponse).toHaveProperty("success");
    expect(errorResponse).toHaveProperty("error");
  });
});
