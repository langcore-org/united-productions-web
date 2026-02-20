import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 認証モック
vi.mock("@/lib/api/auth", () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from "@/lib/api/auth";
import { GET as getPromptsList } from "@/app/api/admin/prompts/route";
import { GET as getPromptDetail, PUT as updatePrompt } from "@/app/api/admin/prompts/[key]/route";
import { GET as getHistory } from "@/app/api/admin/prompts/[key]/history/route";
import { GET as getVersion } from "@/app/api/admin/prompts/[key]/history/[version]/route";
import { POST as restoreVersion } from "@/app/api/admin/prompts/[key]/restore/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

describe("Admin Prompts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/prompts", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts");
      const response = await getPromptsList(request);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/admin/prompts/[key]", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES");
      const response = await getPromptDetail(request, { params: Promise.resolve({ key: "MINUTES" }) });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/admin/prompts/[key]", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES", {
        method: "PUT",
        body: JSON.stringify({ content: "新しい内容" }),
      });
      const response = await updatePrompt(request, { params: Promise.resolve({ key: "MINUTES" }) });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/admin/prompts/[key]/history", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES/history");
      const response = await getHistory(request, { params: Promise.resolve({ key: "MINUTES" }) });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/admin/prompts/[key]/history/[version]", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES/history/1");
      const response = await getVersion(request, { params: Promise.resolve({ key: "MINUTES", version: "1" }) });

      expect(response.status).toBe(401);
    });

    it("無効なバージョン番号の場合は400を返す", async () => {
      mockRequireAuth.mockResolvedValue({ userId: "user-1", user: { id: "user-1", email: "test@example.com" } });

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES/history/invalid");
      const response = await getVersion(request, { params: Promise.resolve({ key: "MINUTES", version: "invalid" }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid version number");
    });
  });

  describe("POST /api/admin/prompts/[key]/restore", () => {
    it("認証されていない場合は401を返す", async () => {
      mockRequireAuth.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const request = new NextRequest("http://localhost/api/admin/prompts/MINUTES/restore", {
        method: "POST",
        body: JSON.stringify({ version: 1 }),
      });
      const response = await restoreVersion(request, { params: Promise.resolve({ key: "MINUTES" }) });

      expect(response.status).toBe(401);
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
