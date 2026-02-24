/**
 * Admin Users API
 *
 * GET /api/admin/users - ユーザー一覧取得
 * PATCH /api/admin/users/:id/role - ユーザー権限更新
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users
 * ユーザー一覧を取得
 */
export async function GET(request: NextRequest) {
  // 認証チェック（ログイン済みユーザー）
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 検索条件
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // ユーザー一覧を取得
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              meetingNotes: true,
              transcripts: true,
              researchChats: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user) => ({
          ...user,
          usage: {
            meetingNotes: user._count.meetingNotes,
            transcripts: user._count.transcripts,
            researchChats: user._count.researchChats,
            total: user._count.meetingNotes + user._count.transcripts + user._count.researchChats,
          },
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + users.length < total,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
