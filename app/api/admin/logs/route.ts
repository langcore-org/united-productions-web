/**
 * アプリケーションログAPI
 *
 * GET /api/admin/logs
 * ログ一覧を取得（フィルタ、ソート、ページネーション対応）
 *
 * DELETE /api/admin/logs
 * 古いログを削除
 */

import type { LogCategory, LogLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

interface LogFilters {
  level?: LogLevel;
  category?: LogCategory;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /api/admin/logs
 * ログ一覧を取得
 *
 * Query Parameters:
 * - level: DEBUG | INFO | WARN | ERROR | AUDIT
 * - category: AUTH | API | DB | SYSTEM | USER_ACTION | SECURITY | PERFORMANCE
 * - userId: ユーザーID
 * - search: 検索キーワード
 * - startDate: 開始日（ISO形式）
 * - endDate: 終了日（ISO形式）
 * - page: ページ番号（1-based）
 * - limit: 1ページあたりの件数（最大100）
 * - sortBy: ソート項目（createdAt, level, category）
 * - sortOrder: asc | desc
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);

    // フィルタパラメータ
    const level = searchParams.get("level") as LogLevel | null;
    const category = searchParams.get("category") as LogCategory | null;
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // ページネーション
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // ソート
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // WHERE句構築
    const where: any = {};

    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { details: { path: [], string_contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // ソート順序
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // ログ取得
    const [logs, totalCount, levelCounts, categoryCounts] = await Promise.all([
      prisma.appLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.appLog.count({ where }),
      prisma.appLog.groupBy({
        by: ["level"],
        _count: { level: true },
      }),
      prisma.appLog.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
    ]);

    // レスポンス
    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          level: log.level,
          category: log.category,
          message: log.message,
          details: log.details,
          user: log.user,
          requestId: log.requestId,
          path: log.path,
          method: log.method,
          ip: log.ip,
          duration: log.duration,
          errorCode: log.errorCode,
          createdAt: log.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        },
        filters: {
          level: levelCounts.map((c) => ({ value: c.level, count: c._count.level })),
          category: categoryCounts.map((c) => ({ value: c.category, count: c._count.category })),
        },
      },
    });
  } catch (error) {
    console.error("Logs API error:", error);
    return NextResponse.json(
      { success: false, error: "ログの取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/logs
 * 古いログを削除
 *
 * Query Parameters:
 * - days: 保持日数（これより古いログを削除）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.appLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
        deletedBefore: cutoffDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Logs delete error:", error);
    return NextResponse.json(
      { success: false, error: "ログの削除に失敗しました" },
      { status: 500 },
    );
  }
}
