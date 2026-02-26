"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bug,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Info,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LOG_LEVELS = [
  { value: "DEBUG", label: "DEBUG", color: "bg-gray-500", icon: Bug },
  { value: "INFO", label: "INFO", color: "bg-blue-500", icon: Info },
  { value: "WARN", label: "WARN", color: "bg-yellow-500", icon: AlertTriangle },
  { value: "ERROR", label: "ERROR", color: "bg-red-500", icon: AlertCircle },
  { value: "AUDIT", label: "AUDIT", color: "bg-purple-500", icon: Eye },
] as const;

const LOG_CATEGORIES = [
  { value: "AUTH", label: "認証" },
  { value: "API", label: "API" },
  { value: "DB", label: "データベース" },
  { value: "SYSTEM", label: "システム" },
  { value: "USER_ACTION", label: "ユーザー操作" },
  { value: "SECURITY", label: "セキュリティ" },
  { value: "PERFORMANCE", label: "パフォーマンス" },
] as const;

interface Log {
  id: string;
  level: string;
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  requestId: string | null;
  path: string | null;
  method: string | null;
  ip: string | null;
  duration: number | null;
  errorCode: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "50");
      if (selectedLevel) params.append("level", selectedLevel);
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ログの取得に失敗しました");
      }

      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedLevel, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchLogs]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLevel("");
    setSelectedCategory("");
    setCurrentPage(1);
  };

  const handleDeleteOldLogs = async () => {
    if (!confirm("30日より古いログを削除しますか？")) return;

    try {
      const response = await fetch("/api/admin/logs?days=30", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error);
      alert(`${data.data.deletedCount}件のログを削除しました`);
      fetchLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const getLevelConfig = (level: string) => {
    return LOG_LEVELS.find((l) => l.value === level) || LOG_LEVELS[1];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP");
  };

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">アプリケーションログ</h1>
                <p className="text-gray-500">システムログの閲覧と管理</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={isAutoRefresh ? "bg-green-50 text-green-600" : ""}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isAutoRefresh && "animate-spin")} />
                {isAutoRefresh ? "自動更新ON" : "自動更新OFF"}
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                更新
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteOldLogs}>
                <Trash2 className="w-4 h-4 mr-2" />
                古いログ削除
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="ログメッセージを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={selectedLevel || "all"}
                  onValueChange={(v) => setSelectedLevel(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="レベル" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {LOG_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedCategory || "all"}
                  onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {LOG_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || selectedLevel || selectedCategory) && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    クリア
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">エラーが発生しました</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                ログ一覧
                {pagination && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({pagination.totalCount.toLocaleString()}件)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                        レベル
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                        カテゴリ
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                        メッセージ
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                        ユーザー
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                        日時
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const levelConfig = getLevelConfig(log.level);
                      const LevelIcon = levelConfig.icon;

                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <Badge className={cn("text-white", levelConfig.color)}>
                              <LevelIcon className="w-3 h-3 mr-1" />
                              {log.level}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-600">{log.category}</span>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <p className="text-sm text-gray-900 truncate">{log.message}</p>
                          </td>
                          <td className="py-3 px-4">
                            {log.user ? (
                              <span className="text-xs text-gray-600">{log.user.email}</span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-500">
                              {formatDate(log.createdAt)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Badge className={cn("text-white", levelConfig.color)}>
                                      {log.level}
                                    </Badge>
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <p className="text-sm">{log.message}</p>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">カテゴリ:</span>{" "}
                                      {log.category}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">日時:</span>{" "}
                                      {formatDate(log.createdAt)}
                                    </div>
                                    {log.user && (
                                      <div>
                                        <span className="text-gray-500">ユーザー:</span>{" "}
                                        {log.user.email}
                                      </div>
                                    )}
                                    {log.ip && (
                                      <div>
                                        <span className="text-gray-500">IP:</span> {log.ip}
                                      </div>
                                    )}
                                    {log.path && (
                                      <div>
                                        <span className="text-gray-500">パス:</span> {log.path}
                                      </div>
                                    )}
                                  </div>
                                  {log.details && (
                                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          ログがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <span className="text-sm text-gray-500">
                    {pagination.totalCount.toLocaleString()}件中
                    {((pagination.page - 1) * pagination.limit + 1).toLocaleString()} -
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.totalCount,
                    ).toLocaleString()}
                    件
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
