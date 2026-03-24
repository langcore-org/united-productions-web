/**
 * API使用量・コスト監視API（Supabase版）
 *
 * GET /api/admin/usage
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/api/utils";
import { createAdminClient } from "@/lib/supabase/admin";

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
  byTool: {
    toolName: string;
    requests: number;
    cost: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startISO = startDate.toISOString();

    const supabase = createAdminClient();

    const { data: allLogs, error: logsError } = await supabase
      .from("usage_logs")
      .select("id, user_id, provider, input_tokens, output_tokens, cost, metadata, created_at")
      .gte("created_at", startISO)
      .order("created_at", { ascending: false });

    if (logsError) throw logsError;
    const logs = allLogs || [];

    const totalCost = logs.reduce((sum, l) => sum + Number(l.cost), 0);
    const totalInputTokens = logs.reduce((sum, l) => sum + l.input_tokens, 0);
    const totalOutputTokens = logs.reduce((sum, l) => sum + l.output_tokens, 0);

    const providerMap = new Map<
      string,
      { cost: number; requests: number; inputTokens: number; outputTokens: number }
    >();
    const dayMap = new Map<string, { cost: number; requests: number }>();
    const userMap = new Map<string, { cost: number; requests: number }>();

    for (const log of logs) {
      const p = providerMap.get(log.provider) || {
        cost: 0,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      p.cost += Number(log.cost);
      p.requests++;
      p.inputTokens += log.input_tokens;
      p.outputTokens += log.output_tokens;
      providerMap.set(log.provider, p);

      const day = log.created_at.split("T")[0];
      const d = dayMap.get(day) || { cost: 0, requests: 0 };
      d.cost += Number(log.cost);
      d.requests++;
      dayMap.set(day, d);

      const u = userMap.get(log.user_id) || { cost: 0, requests: 0 };
      u.cost += Number(log.cost);
      u.requests++;
      userMap.set(log.user_id, u);
    }

    const userIds = [...userMap.keys()];
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    const usersMap = new Map((usersData || []).map((u) => [u.id, u]));

    type ToolInfo = {
      webSearch?: boolean;
      xSearch?: boolean;
      codeExecution?: boolean;
      fileSearch?: boolean;
    };

    const toolStats = {
      webSearch: { requests: 0, cost: 0 },
      xSearch: { requests: 0, cost: 0 },
      codeExecution: { requests: 0, cost: 0 },
      fileSearch: { requests: 0, cost: 0 },
    };

    for (const log of logs) {
      if (!["GROK_4_1_FAST_REASONING", "GROK_4_0709"].includes(log.provider)) continue;
      const metadata = log.metadata as Record<string, unknown> | null;
      const tools = metadata?.tools as ToolInfo | undefined;
      if (!tools) continue;

      const c = Number(log.cost);
      if (tools.webSearch) {
        toolStats.webSearch.requests++;
        toolStats.webSearch.cost += c;
      }
      if (tools.xSearch) {
        toolStats.xSearch.requests++;
        toolStats.xSearch.cost += c;
      }
      if (tools.codeExecution) {
        toolStats.codeExecution.requests++;
        toolStats.codeExecution.cost += c;
      }
      if (tools.fileSearch) {
        toolStats.fileSearch.requests++;
        toolStats.fileSearch.cost += c;
      }
    }

    const byTool = [
      { toolName: "Web検索", ...toolStats.webSearch },
      { toolName: "X検索", ...toolStats.xSearch },
      { toolName: "コード実行", ...toolStats.codeExecution },
      { toolName: "ファイル検索", ...toolStats.fileSearch },
    ].filter((t) => t.requests > 0);

    const stats: UsageStats = {
      totalCost,
      totalRequests: logs.length,
      totalInputTokens,
      totalOutputTokens,
      byProvider: [...providerMap.entries()]
        .map(([provider, v]) => ({ provider, ...v }))
        .sort((a, b) => b.cost - a.cost),
      byDay: [...dayMap.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => b.date.localeCompare(a.date)),
      byUser: [...userMap.entries()]
        .map(([userId, v]) => {
          const user = usersMap.get(userId);
          return {
            userId,
            userName: user?.name || null,
            userEmail: user?.email || "Unknown",
            ...v,
          };
        })
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 20),
      byTool,
    };

    const recentLogs = logs.slice(0, 50).map((log) => {
      const user = usersMap.get(log.user_id);
      return {
        id: log.id,
        provider: log.provider,
        inputTokens: log.input_tokens,
        outputTokens: log.output_tokens,
        cost: log.cost,
        userName: user?.name || null,
        userEmail: user?.email || "Unknown",
        createdAt: log.created_at,
        metadata: log.metadata,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentLogs,
        period: { start: startISO, end: new Date().toISOString(), days },
      },
    });
  } catch (error) {
    console.error("Usage stats error:", error);
    return errorResponse("統計データの取得に失敗しました", 500);
  }
}
