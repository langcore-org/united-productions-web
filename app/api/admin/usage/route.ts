/**
 * API使用量・コスト監視API
 * 
 * GET /api/admin/usage
 * 使用量統計を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api/auth";

interface UsageStats {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: {
    provider: string;
    cost: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }[];
  byDay: {
    date: string;
    cost: number;
    requests: number;
  }[];
  byUser: {
    userId: string;
    userName: string | null;
    userEmail: string;
    cost: number;
    requests: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    
    // 日付範囲の取得（デフォルト：過去30日）
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 全体の統計
    const totalStats = await prisma.usageLog.aggregate({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        cost: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true,
      },
    });

    // プロバイダー別の統計
    const byProvider = await prisma.usageLog.groupBy({
      by: ["provider"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        cost: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          cost: "desc",
        },
      },
    });

    // 日別の統計
    const byDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM(cost) as cost,
        COUNT(*) as requests
      FROM "UsageLog"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    // ユーザー別の統計
    const byUser = await prisma.usageLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        cost: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          cost: "desc",
        },
      },
      take: 20,
    });

    // ユーザー情報を取得
    const userIds = byUser.map((u) => u.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 最近の使用履歴
    const recentLogs = await prisma.usageLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const stats: UsageStats = {
      totalCost: totalStats._sum.cost || 0,
      totalRequests: totalStats._count.id || 0,
      totalInputTokens: totalStats._sum.inputTokens || 0,
      totalOutputTokens: totalStats._sum.outputTokens || 0,
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        cost: p._sum.cost || 0,
        requests: p._count.id,
        inputTokens: p._sum.inputTokens || 0,
        outputTokens: p._sum.outputTokens || 0,
      })),
      byDay: (byDay as any[]).map((d) => ({
        date: d.date.toISOString().split("T")[0],
        cost: Number(d.cost) || 0,
        requests: Number(d.requests) || 0,
      })),
      byUser: byUser.map((u) => {
        const user = userMap.get(u.userId);
        return {
          userId: u.userId,
          userName: user?.name || null,
          userEmail: user?.email || "Unknown",
          cost: u._sum.cost || 0,
          requests: u._count.id,
        };
      }),
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          provider: log.provider,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          cost: log.cost,
          userName: log.user.name,
          userEmail: log.user.email,
          createdAt: log.createdAt.toISOString(),
          metadata: log.metadata,
        })),
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days,
        },
      },
    });

  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { success: false, error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
