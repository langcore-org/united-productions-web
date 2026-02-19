"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  Activity,
  Users,
  Cpu,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { PROVIDER_COLORS } from "@/lib/llm/constants";

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
  "#ff6b00", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

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

interface RecentLog {
  id: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  userName: string | null;
  userEmail: string;
  createdAt: string;
  metadata: any;
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
  }, [period]);

  // 自動更新（30秒ごと）
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [period]);

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

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>データを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
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
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
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
                          {stats.byProvider.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
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
                            <p className="font-medium text-sm">
                              {PROVIDER_LABELS[provider.provider] || provider.provider}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatNumber(provider.requests)} リクエスト
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {formatCurrency(provider.cost)}
                          </p>
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
                  {stats.byUser
                    .slice(0, expandedUsers ? undefined : 10)
                    .map((user, index) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm">
                              {user.userName || "未設定"}
                            </p>
                            <p className="text-xs text-gray-500">{user.userEmail}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {formatCurrency(user.cost)}
                          </p>
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
                          <p className="font-medium">{log.userName || "未設定"}</p>
                          <p className="text-xs text-gray-500">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {PROVIDER_LABELS[log.provider] || log.provider}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className="text-gray-600">
                          {formatNumber(log.inputTokens)}
                        </span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600">
                          {formatNumber(log.outputTokens)}
                        </span>
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
  );
}
