"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cpu,
  DollarSign,
  FileSearch,
  RefreshCw,
  Search,
  Terminal,
  TrendingDown,
  TrendingUp,
  Twitter,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// プロバイダー表示名
const PROVIDER_LABELS: Record<string, string> = {
  GEMINI_25_FLASH_LITE: "Gemini 2.5 Flash",
  GEMINI_30_FLASH: "Gemini 3.0 Flash",
  GROK_4_1_FAST_REASONING: "Grok 4.1 Fast",
  GROK_4_0709: "Grok 4",
  GPT_4O_MINI: "GPT-4o Mini",
  GPT_5: "GPT-5",
  CLAUDE_SONNET_45: "Claude Sonnet",
  CLAUDE_OPUS_46: "Claude Opus",
  PERPLEXITY_SONAR: "Perplexity Sonar",
  PERPLEXITY_SONAR_PRO: "Perplexity Pro",
};

// プロバイダー色
const COLORS = [
  "#ff6b00",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// ツール表示名
const TOOL_LABELS: Record<string, string> = {
  Web検索: "Web検索",
  X検索: "X検索",
  コード実行: "コード実行",
  ファイル検索: "ファイル検索",
};

// ツールアイコン
const TOOL_ICONS: Record<string, React.ElementType> = {
  Web検索: Search,
  X検索: Twitter,
  コード実行: Terminal,
  ファイル検索: FileSearch,
};

// ツール色
const TOOL_COLORS = {
  Web検索: "#3b82f6",
  X検索: "#000000",
  コード実行: "#22c55e",
  ファイル検索: "#f59e0b",
};

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

interface RecentLog {
  id: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  userName: string | null;
  userEmail: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [period, setPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/usage?days=${period}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "データの取得に失敗しました");
      }

      setStats(data.data.stats);
      setRecentLogs(data.data.recentLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // 自動更新（30秒ごと）
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  // 数字フォーマット
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP").format(num);
  };

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  // ツール情報の型
  type ToolInfo = {
    webSearch?: boolean;
    xSearch?: boolean;
    codeExecution?: boolean;
    fileSearch?: boolean;
  };

  // ツール使用有無を判定
  const hasToolUsage = (log: RecentLog): boolean => {
    const tools = log.metadata?.tools as ToolInfo | undefined;
    if (!tools) return false;
    return Boolean(tools.webSearch || tools.xSearch || tools.codeExecution || tools.fileSearch);
  };

  // 使用ツール一覧を取得
  const getUsedTools = (log: RecentLog): string[] => {
    const tools = log.metadata?.tools as ToolInfo | undefined;
    if (!tools) return [];
    const used: string[] = [];
    if (tools.webSearch) used.push("Web");
    if (tools.xSearch) used.push("X");
    if (tools.codeExecution) used.push("Code");
    if (tools.fileSearch) used.push("File");
    return used;
  };

  if (isLoading && !stats) {
    return (
      <AdminLayout>
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>データを読み込み中...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="h-full overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">エラーが発生しました</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <Button onClick={fetchData} variant="outline" className="mt-3">
                  再試行
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API使用量・コスト</h1>
                <p className="text-gray-500">リアルタイムでの使用状況とコスト監視</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
                {[7, 30, 90].map((days) => (
                  <Button
                    key={days}
                    variant={period === days ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPeriod(days)}
                    className={period === days ? "bg-blue-500 text-white" : ""}
                  >
                    {days}日
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchData}
                disabled={isLoading}
                className={isLoading ? "animate-spin" : ""}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">総コスト</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(stats.totalCost)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">総リクエスト</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.totalRequests)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Input Tokens</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.totalInputTokens)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Output Tokens</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatNumber(stats.totalOutputTokens)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* グラフセクション */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList className="bg-white border">
              <TabsTrigger value="daily">日別推移</TabsTrigger>
              <TabsTrigger value="provider">プロバイダー別</TabsTrigger>
              <TabsTrigger value="tools">
                <Bot className="w-4 h-4 mr-1" />
                ツール別
              </TabsTrigger>
              <TabsTrigger value="users">ユーザー別</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    日別コスト推移
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...stats.byDay].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          stroke="#9ca3af"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="#9ca3af"
                          fontSize={12}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => formatDate(String(label))}
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cost"
                          stroke="#ff6b00"
                          strokeWidth={2}
                          dot={{ fill: "#ff6b00", strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="provider">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="w-5 h-5" />
                      プロバイダー別コスト
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.byProvider}
                            dataKey="cost"
                            nameKey="provider"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {stats.byProvider.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>プロバイダー別詳細</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byProvider.map((provider, index) => (
                        <div
                          key={provider.provider}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium text-sm text-gray-900">
                                {PROVIDER_LABELS[provider.provider] || provider.provider}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatNumber(provider.requests)} リクエスト
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(provider.cost)}</p>
                            <p className="text-xs text-gray-500">
                              {formatNumber(provider.inputTokens + provider.outputTokens)} tokens
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ツール別タブ（2026-02-20追加） */}
            <TabsContent value="tools">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Grokツール使用状況
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.byTool.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.byTool}
                              dataKey="requests"
                              nameKey="toolName"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                            >
                              {stats.byTool.map((_entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    Object.values(TOOL_COLORS)[
                                      index % Object.values(TOOL_COLORS).length
                                    ]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} 回`, name]}
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Bot className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>ツール使用データがありません</p>
                          <p className="text-sm text-gray-400">Grokモデルの使用時に記録されます</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ツール別詳細</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.byTool.length > 0 ? (
                      <div className="space-y-3">
                        {stats.byTool.map((tool) => {
                          const Icon = TOOL_ICONS[tool.toolName] || Bot;
                          const color =
                            TOOL_COLORS[tool.toolName as keyof typeof TOOL_COLORS] || "#6b7280";
                          return (
                            <div
                              key={tool.toolName}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${color}15` }}
                                >
                                  <Icon className="w-5 h-5" style={{ color }} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    {TOOL_LABELS[tool.toolName] || tool.toolName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatNumber(tool.requests)} 回使用
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">{formatCurrency(tool.cost)}</p>
                                <p className="text-xs text-gray-500">コスト</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Bot className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>ツール使用データがありません</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Grokモデル使用時のツール呼び出しが記録されます
                        </p>
                      </div>
                    )}

                    {/* ツール説明 */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">利用可能なツール</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            name: "Web検索",
                            icon: Search,
                            desc: "インターネット検索",
                            color: "#3b82f6",
                          },
                          {
                            name: "X検索",
                            icon: Twitter,
                            desc: "X(Twitter)検索",
                            color: "#000000",
                          },
                          {
                            name: "コード実行",
                            icon: Terminal,
                            desc: "Python実行",
                            color: "#22c55e",
                          },
                          {
                            name: "ファイル検索",
                            icon: FileSearch,
                            desc: "ドキュメント検索",
                            color: "#f59e0b",
                          },
                        ].map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                          >
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: `${tool.color}15` }}
                            >
                              <tool.icon className="w-4 h-4" style={{ color: tool.color }} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{tool.name}</p>
                              <p className="text-[10px] text-gray-500">{tool.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        ※ 2026-02-20より、全ツールが常時有効となりました
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    ユーザー別使用量
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.byUser.slice(0, expandedUsers ? undefined : 10).map((user, index) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {user.userName || "未設定"}
                            </p>
                            <p className="text-xs text-gray-500">{user.userEmail}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(user.cost)}</p>
                          <p className="text-xs text-gray-500">
                            {formatNumber(user.requests)} リクエスト
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {stats.byUser.length > 10 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-4"
                      onClick={() => setExpandedUsers(!expandedUsers)}
                    >
                      {expandedUsers ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          折りたたむ
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          さらに表示 ({stats.byUser.length - 10}件)
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 最近の使用履歴 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の使用履歴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        日時
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        ユーザー
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        プロバイダー
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        ツール
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                        Tokens
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                        コスト
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentLogs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">
                          {new Date(log.createdAt).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{log.userName || "未設定"}</p>
                            <p className="text-xs text-gray-500">{log.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {PROVIDER_LABELS[log.provider] || log.provider}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {hasToolUsage(log) ? (
                            <div className="flex flex-wrap gap-1">
                              {getUsedTools(log).map((tool) => (
                                <Badge
                                  key={tool}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className="text-gray-600">{formatNumber(log.inputTokens)}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-600">{formatNumber(log.outputTokens)}</span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-right">
                          {formatCurrency(log.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 戻るリンク */}
          <div className="flex justify-start">
            <Link href="/admin">
              <Button variant="outline">← 管理画面トップへ</Button>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
