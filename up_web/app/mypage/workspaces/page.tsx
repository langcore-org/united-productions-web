import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MoreVertical, Plus, Users, Tv, ArrowRight, Settings, LogOut, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { getStorageUrl } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

type WorkspaceWithStats = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: "owner" | "admin" | "member";
  member_count: number;
  program_count: number;
};

async function getWorkspaces(): Promise<WorkspaceWithStats[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get workspaces the user is a member of
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select(`
      role,
      workspaces (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Get member counts and program counts for each workspace
  type WorkspaceData = { id: string; name: string; slug: string; logo_url: string | null };
  const workspaceIds = memberships
    .map((m) => (m.workspaces as unknown as WorkspaceData | null)?.id)
    .filter((id): id is string => id != null);

  // Get member counts
  const { data: memberCounts } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .in("workspace_id", workspaceIds)
    .eq("status", "active");

  // Get program counts
  const { data: programCounts } = await supabase
    .from("programs")
    .select("workspace_id")
    .in("workspace_id", workspaceIds);

  // Aggregate counts
  const memberCountMap = new Map<string, number>();
  const programCountMap = new Map<string, number>();

  memberCounts?.forEach((m) => {
    memberCountMap.set(m.workspace_id, (memberCountMap.get(m.workspace_id) || 0) + 1);
  });

  programCounts?.forEach((p) => {
    programCountMap.set(p.workspace_id, (programCountMap.get(p.workspace_id) || 0) + 1);
  });

  return memberships
    .filter((m) => m.workspaces != null)
    .map((m) => {
      const ws = m.workspaces as unknown as WorkspaceData;
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        logo_url: ws.logo_url,
        role: m.role as "owner" | "admin" | "member",
        member_count: memberCountMap.get(ws.id) || 0,
        program_count: programCountMap.get(ws.id) || 0,
      };
    });
}

export default async function WorkspacesPage() {
  const workspaces = await getWorkspaces();

  return (
    <div>
      <PageHeader
        title="ワークスペース一覧"
        description="参加中のワークスペースを管理します"
      />

      <div className="space-y-4">
        {workspaces.map((workspace) => (
          <WorkspaceRow key={workspace.id} workspace={workspace} />
        ))}
      </div>

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/mypage/create-workspace">
            <Plus className="mr-2 h-4 w-4" />
            新しいワークスペースを作成
          </Link>
        </Button>
      </div>
    </div>
  );
}

function WorkspaceRow({
  workspace,
}: {
  workspace: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    role: "owner" | "admin" | "member";
    member_count: number;
    program_count: number;
  };
}) {
  const roleLabels = {
    owner: "オーナー",
    admin: "管理者",
    member: "メンバー",
  };

  const isAdmin = workspace.role === "owner" || workspace.role === "admin";
  const isOwner = workspace.role === "owner";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getStorageUrl(workspace.logo_url) ?? workspace.logo_url}
                alt={workspace.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-medium">{workspace.name}</h3>
            <p className="text-sm text-muted-foreground">
              役割: {roleLabels[workspace.role]} •
              <span className="inline-flex items-center gap-1 ml-2">
                <Users className="h-3 w-3" />
                {workspace.member_count}名
              </span>
              <span className="inline-flex items-center gap-1 ml-2">
                <Tv className="h-3 w-3" />
                {workspace.program_count}つ
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" asChild>
            <Link href={`/${workspace.slug}/dashboard`}>
              入る
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/${workspace.slug}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      設定
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${workspace.slug}/members`}>
                      <Users className="mr-2 h-4 w-4" />
                      メンバー管理
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!isOwner && (
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出する
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除する
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
