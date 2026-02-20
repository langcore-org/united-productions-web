"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mic,
  MessageSquare,
  Mail,
  User,
  Shield,
  UserCircle,
  AlertTriangle,
} from "lucide-react";
import { STYLES } from "@/lib/admin-styles";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  usage: {
    meetingNotes: number;
    transcripts: number;
    researchChats: number;
    total: number;
  };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// 統計バッジのスタイル（モノトーン）
const STAT_STYLES = [
  "bg-gray-100 text-gray-800",
  "bg-gray-200 text-gray-800",
  "bg-gray-300 text-gray-800",
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ユーザー一覧を取得
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/admin/users?${params}`);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
      } else {
        setMessage({ type: "error", text: "ユーザーの取得に失敗しました" });
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setMessage({ type: "error", text: "ユーザーの取得に失敗しました" });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // メッセージを自動消去
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 検索
  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    fetchUsers();
  };

  // ページ変更
  const handlePageChange = (newOffset: number) => {
    setPagination((prev) => ({ ...prev, offset: newOffset }));
  };

  // 権限を切り替え
  const toggleRole = async (userId: string, currentRole: string) => {
    setUpdatingUserId(userId);
    try {
      const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (result.success) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );
        setMessage({
          type: "success",
          text: `${result.data.name || result.data.email} を ${newRole === "ADMIN" ? "管理者" : "一般ユーザー"} に変更しました`,
        });
      } else {
        setMessage({ type: "error", text: result.error || "権限の更新に失敗しました" });
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      setMessage({ type: "error", text: "権限の更新に失敗しました" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={STYLES.headerIcon}>
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ユーザー一覧</h1>
                <p className="text-gray-500">
                  登録ユーザー: {pagination.total.toLocaleString()}名
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="名前またはメールアドレスで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} className={STYLES.button.primary}>
                <Search className="w-4 h-4 mr-2" />
                検索
              </Button>
            </div>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success" ? STYLES.alert.success : STYLES.alert.error
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 注意書き */}
          <div className={STYLES.alert.warning}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">権限について</p>
                <p className="mt-1">
                  管理者（ADMIN）は管理画面にアクセスできます。一般ユーザー（USER）は通常機能のみ使用できます。
                  自分自身の権限は変更できません。
                </p>
              </div>
            </div>
          </div>

          {/* ユーザー一覧 */}
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <Card key={user.id} className={STYLES.cardHover}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* ユーザー情報 */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {user.name || "名前未設定"}
                          </h3>
                          {user.role === "ADMIN" ? (
                            <Badge className="bg-gray-900 text-white hover:bg-gray-800">
                              <Shield className="w-3 h-3 mr-1" />
                              管理者
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              <UserCircle className="w-3 h-3 mr-1" />
                              一般ユーザー
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          登録日: {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                    </div>

                    {/* 利用統計と権限切り替え */}
                    <div className="flex items-center gap-4">
                      <StatBadge
                        icon={FileText}
                        count={user.usage.meetingNotes}
                        label="議事録"
                        styleIndex={0}
                      />
                      <StatBadge
                        icon={Mic}
                        count={user.usage.transcripts}
                        label="NA原稿"
                        styleIndex={1}
                      />
                      <StatBadge
                        icon={MessageSquare}
                        count={user.usage.researchChats}
                        label="リサーチ"
                        styleIndex={2}
                      />
                      <div className="ml-4 pl-4 border-l border-gray-200">
                        <div className="text-2xl font-bold text-gray-900">
                          {user.usage.total}
                        </div>
                        <div className="text-xs text-gray-500">合計利用</div>
                      </div>
                      
                      {/* 権限切り替えボタン */}
                      <div className="ml-4 pl-4 border-l border-gray-200">
                        <Button
                          variant={user.role === "ADMIN" ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleRole(user.id, user.role)}
                          disabled={updatingUserId === user.id}
                          className={user.role === "ADMIN" ? "bg-gray-900 hover:bg-gray-800" : ""}
                        >
                          {updatingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : user.role === "ADMIN" ? (
                            <>
                              <Shield className="w-4 h-4 mr-1" />
                              管理者
                            </>
                          ) : (
                            <>
                              <UserCircle className="w-4 h-4 mr-1" />
                              一般
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ページネーション */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                {pagination.offset + 1} -{" "}
                {Math.min(pagination.offset + users.length, pagination.total)} /{" "}
                {pagination.total.toLocaleString()}名
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                  disabled={pagination.offset === 0 || loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={!pagination.hasMore || loading}
                >
                  次へ
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {users.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>ユーザーが見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// 統計バッジコンポーネント
interface StatBadgeProps {
  icon: React.ElementType;
  count: number;
  label: string;
  styleIndex: number;
}

function StatBadge({ icon: Icon, count, label, styleIndex }: StatBadgeProps) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <Badge className={`${STAT_STYLES[styleIndex % STAT_STYLES.length]} mb-1`}>
        <Icon className="w-3 h-3 mr-1" />
        {count}
      </Badge>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
