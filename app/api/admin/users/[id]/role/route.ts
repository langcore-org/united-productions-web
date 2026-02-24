/**
 * Admin User Role API
 *
 * PATCH /api/admin/users/:id/role - ユーザー権限更新
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"]),
});

/**
 * PATCH /api/admin/users/:id/role
 * ユーザーの権限を更新
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 認証チェック（ログイン済みユーザー）
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;

    // リクエストボディをパース
    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { role } = validationResult.data;

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "ユーザーが見つかりません" },
        { status: 404 },
      );
    }

    // 権限を更新
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
