/**
 * Admin User Role API
 * 
 * PATCH /api/admin/users/:id/role - ユーザー権限更新
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"]),
});

/**
 * PATCH /api/admin/users/:id/role
 * ユーザーの権限を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者権限チェック
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await params;

    // 自分自身の権限は変更できない
    if (id === authResult.user.id) {
      return NextResponse.json(
        { success: false, error: "自分自身の権限は変更できません" },
        { status: 400 }
      );
    }

    // リクエストボディをパース
    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
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
        { status: 404 }
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
      { status: 500 }
    );
  }
}
