"use client";

import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChatHistory {
  id: string;
  featureId: string;
  title: string;
  agentType: string;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// 機能別フィルター
const FEATURE_FILTERS = [
  { id: "all", label: "すべて", icon: MessageSquare },
  { id: "general-chat", label: "チャット", icon: MessageSquare },
  { id: "research-cast", label: "出演者リサーチ", icon: Users },
  { id: "research-evidence", label: "エビデンスリサーチ", icon: Shield },
  { id: "minutes", label: "議事録作成", icon: FileText },
  { id: "proposal", label: "新企画立案", icon: Lightbulb },
];

// 機能名を取得
function getFeatureLabel(featureId: string): string {
  const feature = FEATURE_FILTERS.find((f) => f.id === featureId);
  return feature?.label || featureId;
}

// 機能アイコンを取得
function getFeatureIcon(featureId: string) {
  const feature = FEATURE_FILTERS.find((f) => f.id === featureId);
  return feature?.icon || MessageSquare;
}

// 相対時間を計算
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "今";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 履歴を取得
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      const response = await fetch(`/api/chat/history?${params}`);
      if (!response.ok) {
        throw new Error("履歴の取得に失敗しました");
      }

      const data = await response.json();
      setHistory(data.history || []);

      // ページネーション情報を計算
      const total = data.history?.length || 0;
      setPagination((prev) => ({
        ...prev,
        total,
        hasMore: total >= prev.limit,
      }));
    } catch (_err) {
      console.error("Failed to fetch history:", _err);
      setMessage({ type: "error", text: "履歴の取得に失敗しました" });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // メッセージを自動消去
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 履歴を削除
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("このチャット履歴を削除しますか？")) return;

    try {
      const response = await fetch(`/api/chat/history?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("削除に失敗しました");
      }

      // 削除後にリストを更新
      setHistory((prev) => prev.filter((h) => h.id !== id));
      setMessage({ type: "success", text: "履歴を削除しました" });
    } catch (_err) {
      setMessage({ type: "error", text: "削除に失敗しました" });
    }
  };

  // チャットを開く
  const handleOpenChat = (featureId: string, chatId: string) => {
    router.push(`/chat?agent=${featureId}&chatId=${chatId}`);
  };

  // フィルタリングとソート
  const filteredHistory = history
    .filter((item) => {
      // 機能フィルター
      if (selectedFeature !== "all" && item.featureId !== selectedFeature) {
        return false;
      }
      // 検索フィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) || item.agentType.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // 日時ソート
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  // ページ変更
  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">チャット履歴</h1>
                <p className="text-gray-500">{filteredHistory.length}件の履歴</p>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* フィルターと検索 */}
          <div className="space-y-4">
            {/* 機能フィルター */}
            <div className="flex flex-wrap gap-2">
              {FEATURE_FILTERS.map((feature) => {
                const Icon = feature.icon;
                const isActive = selectedFeature === feature.id;

                return (
                  <button
                    type="button"
                    key={feature.id}
                    onClick={() => setSelectedFeature(feature.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {feature.label}
                  </button>
                );
              })}
            </div>

            {/* 検索とソート */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="タイトルや内容で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === "desc" ? "新しい順" : "古い順"}
              </Button>
            </div>
          </div>

          {/* 履歴一覧 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>履歴が見つかりません</p>
              {searchQuery && <p className="text-sm mt-2">検索条件を変更してお試しください</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredHistory.map((item) => {
                const FeatureIcon = getFeatureIcon(item.featureId);

                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleOpenChat(item.featureId, item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* アイコン */}
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FeatureIcon className="w-5 h-5 text-gray-600" />
                          </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {getFeatureLabel(item.featureId)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {getRelativeTime(item.updatedAt)}
                              </span>
                              <span>{item.messageCount}件のメッセージ</span>
                            </div>
                          </div>
                        </div>

                        {/* アクション */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ページネーション */}
          {!loading && filteredHistory.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                {pagination.offset + 1} -{" "}
                {Math.min(pagination.offset + filteredHistory.length, pagination.total)} /{" "}
                {pagination.total}件
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                  disabled={pagination.offset === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={!pagination.hasMore}
                >
                  次へ
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
