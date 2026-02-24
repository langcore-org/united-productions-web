/**
 * API使用量・コスト監視API
 *
 * GET /api/admin/usage
 * 使用量統計を取得（ツール使用状況含む）
 *
 * 更新: 2026-02-20 - ツール使用量・ログ統計を追加
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

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
  // ツール使用統計（2026-02-20追加）
  byTool: {
    toolName: string;
    requests: number;
    cost: number;
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

    // ツール別統計（2026-02-20追加）
    // Grokプロバイダーのみツール使用を集計
    const grokLogs = await prisma.usageLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        provider: {
          in: ["GROK_4_1_FAST_REASONING", "GROK_4_0709"],
        },
      },
      select: {
        cost: true,
        metadata: true,
      },
    });

    // ツール使用統計を計算
    const toolStats = {
      webSearch: { requests: 0, cost: 0 },
      xSearch: { requests: 0, cost: 0 },
      codeExecution: { requests: 0, cost: 0 },
      fileSearch: { requests: 0, cost: 0 },
    };

    // ツール情報の型定義
    type ToolInfo = {
      webSearch?: boolean;
      xSearch?: boolean;
      codeExecution?: boolean;
      fileSearch?: boolean;
    };

    for (const log of grokLogs) {
      const metadata = log.metadata as Record<string, unknown> | null;
      const tools = metadata?.tools as ToolInfo | undefined;

      if (tools) {
        if (tools.webSearch) {
          toolStats.webSearch.requests++;
          toolStats.webSearch.cost += log.cost;
        }
        if (tools.xSearch) {
          toolStats.xSearch.requests++;
          toolStats.xSearch.cost += log.cost;
        }
        if (tools.codeExecution) {
          toolStats.codeExecution.requests++;
          toolStats.codeExecution.cost += log.cost;
        }
        if (tools.fileSearch) {
          toolStats.fileSearch.requests++;
          toolStats.fileSearch.cost += log.cost;
        }
      }
    }

    const byTool = [
      { toolName: "Web検索", ...toolStats.webSearch },
      { toolName: "X検索", ...toolStats.xSearch },
      { toolName: "コード実行", ...toolStats.codeExecution },
      { toolName: "ファイル検索", ...toolStats.fileSearch },
    ].filter((t) => t.requests > 0);

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
      byDay: (byDay as { date: Date; cost: bigint | number; requests: bigint | number }[]).map(
        (d) => ({
          date: d.date.toISOString().split("T")[0],
          cost: Number(d.cost) || 0,
          requests: Number(d.requests) || 0,
        }),
      ),
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
      byTool,
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
      { status: 500 },
    );
  }
}
