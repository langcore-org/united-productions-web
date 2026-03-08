import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Building2,
  CreditCard,
  Activity,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default function SystemAdminPage() {
  // Mock data - replace with real data from API
  const stats = {
    totalUsers: 128,
    activeUsers: 95,
    totalWorkspaces: 24,
    activeWorkspaces: 18,
    monthlyRevenue: "¥1,280,000",
    pendingIssues: 3,
  };

  const recentActivity = [
    { id: 1, action: "新規ユーザー登録", user: "田中太郎", time: "5分前" },
    { id: 2, action: "ワークスペース作成", user: "佐藤花子", time: "1時間前" },
    { id: 3, action: "プラン変更", user: "山田一郎", time: "3時間前" },
    { id: 4, action: "新規ユーザー登録", user: "鈴木美咲", time: "5時間前" },
    { id: 5, action: "ワークスペース削除", user: "高橋健太", time: "1日前" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">システム管理</h1>
        <p className="text-muted-foreground">
          システム全体の状況を確認・管理できます
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats.activeUsers}名
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ワークスペース</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {stats.activeWorkspaces}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">月間売上</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              前月比 +12%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              最近のアクティビティ
            </CardTitle>
            <CardDescription>直近のシステムアクティビティ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              アラート
            </CardTitle>
            <CardDescription>対応が必要な項目</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pendingIssues > 0 ? (
                <>
                  <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        未対応の問い合わせ
                      </p>
                      <p className="text-xs text-yellow-600">
                        {stats.pendingIssues}件の対応待ち
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        システム正常稼働中
                      </p>
                      <p className="text-xs text-blue-600">
                        すべてのサービスが正常に動作しています
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  対応が必要な項目はありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
