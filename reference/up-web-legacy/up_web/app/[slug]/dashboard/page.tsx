import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout";
import { Plus, Tv, Users, MessageSquare, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface DashboardPageProps {
  params: Promise<{ slug: string }>;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays === 1) {
    return "昨日";
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return date.toLocaleDateString("ja-JP");
  }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get workspace by slug
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (wsError || !workspace) {
    notFound();
  }

  // Fetch programs for this workspace
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, description, status, updated_at, created_at")
    .eq("workspace_id", workspace.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  // Fetch all teams for programs in this workspace
  const programIds = programs?.map((p) => p.id) || [];
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, program_id")
    .in("program_id", programIds.length > 0 ? programIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch all chat sessions for teams
  const teamIds = allTeams?.map((t) => t.id) || [];
  const { data: allSessions } = await supabase
    .from("chat_sessions")
    .select("id, team_id, title, updated_at, created_by")
    .in("team_id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", "active");

  // Fetch workspace members count
  const { data: members } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("status", "active");

  // Calculate stats
  const stats = {
    programs: programs?.length || 0,
    teams: allTeams?.length || 0,
    sessions: allSessions?.length || 0,
  };

  // Transform programs with team and session counts
  const programsWithStats =
    programs?.map((program) => {
      const programTeams = allTeams?.filter((t) => t.program_id === program.id) || [];
      const programTeamIds = programTeams.map((t) => t.id);
      const programSessions =
        allSessions?.filter((s) => programTeamIds.includes(s.team_id)) || [];

      return {
        id: program.id,
        name: program.name,
        teams: programTeams.length,
        sessions: programSessions.length,
        lastActivity: formatTimeAgo(new Date(program.updated_at)),
      };
    }) || [];

  // Get recent sessions for activity feed
  const recentSessions = allSessions
    ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5) || [];

  // Fetch user info for recent sessions
  const userIds = [...new Set(recentSessions.map((s) => s.created_by).filter(Boolean))];
  const { data: sessionUsers } = await supabase
    .from("users")
    .select("id, display_name, email")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  // Get team info for sessions
  const sessionTeamIds = [...new Set(recentSessions.map((s) => s.team_id))];
  const { data: sessionTeams } = await supabase
    .from("teams")
    .select("id, name")
    .in("id", sessionTeamIds.length > 0 ? sessionTeamIds : ["00000000-0000-0000-0000-000000000000"]);

  const recentActivity = recentSessions.map((session) => {
    const user = sessionUsers?.find((u) => u.id === session.created_by);
    const team = sessionTeams?.find((t) => t.id === session.team_id);
    return {
      user: user?.display_name || user?.email?.split("@")[0] || "ユーザー",
      team: team?.name || "",
      action: session.title || "セッション開始",
      time: formatTimeAgo(new Date(session.updated_at)),
    };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="ワークスペースダッシュボード"
        description={workspace.name}
      />

      {/* Statistics Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">統計サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Tv className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.programs}</p>
                <p className="text-sm text-muted-foreground">番組</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.teams}</p>
                <p className="text-sm text-muted-foreground">チーム</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sessions}</p>
                <p className="text-sm text-muted-foreground">セッション</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs List */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">番組一覧</CardTitle>
          <Button size="sm" asChild>
            <Link href={`/${slug}/programs/new`}>
              <Plus className="mr-2 h-4 w-4" />
              新しい番組
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {programsWithStats.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              番組がありません。新しい番組を作成してください。
            </div>
          ) : (
            programsWithStats.map((program) => (
              <Link
                key={program.id}
                href={`/${slug}/programs/${program.id}`}
                className="block"
              >
                <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Tv className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{program.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          チーム: {program.teams} • セッション: {program.sessions}{" "}
                          • 最終: {program.lastActivity}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近のアクティビティ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                アクティビティがありません
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    {activity.user}さんが
                    {activity.team && `「${activity.team}」で`}
                    {activity.action} - {activity.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
