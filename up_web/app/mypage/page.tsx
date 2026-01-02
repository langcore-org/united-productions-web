import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Plus, Users, Tv, ArrowRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout";
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

type Invitation = {
  id: string;
  workspace_name: string;
  inviter_name: string;
  role: string;
  expires_at: string;
};

async function getWorkspaces(userId: string): Promise<WorkspaceWithStats[]> {
  const supabase = await createClient();

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
    .eq("user_id", userId)
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

async function getInvitations(userEmail: string): Promise<Invitation[]> {
  const supabase = await createClient();

  // Get pending invitations for this user's email
  const { data: invitations } = await supabase
    .from("workspace_members")
    .select(`
      id,
      role,
      invited_at,
      workspaces (
        name
      ),
      inviter:users!workspace_members_invited_by_fkey (
        display_name
      )
    `)
    .eq("email", userEmail)
    .eq("status", "invited");

  if (!invitations || invitations.length === 0) {
    return [];
  }

  // Calculate expiration (7 days from invited_at)
  return invitations
    .filter((inv) => inv.workspaces != null)
    .map((inv) => {
      const workspace = inv.workspaces as unknown as { name: string };
      const inviter = inv.inviter as unknown as { display_name: string } | null;
      const invitedAt = new Date(inv.invited_at);
      const expiresAt = new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      return {
        id: inv.id,
        workspace_name: workspace.name,
        inviter_name: inviter?.display_name || "Unknown",
        role: inv.role,
        expires_at: expiresAt.toISOString(),
      };
    })
    .filter((inv) => new Date(inv.expires_at) > new Date()); // Filter out expired
}

export default async function MypagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [workspaces, invitations] = await Promise.all([
    getWorkspaces(user.id),
    getInvitations(user.email || ""),
  ]);

  const hasWorkspaces = workspaces.length > 0;
  const hasInvitations = invitations.length > 0;

  // Pattern A: Empty state
  if (!hasWorkspaces && !hasInvitations) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="ワークスペースがありません"
          description="ワークスペースを作成するか、招待を待ってください"
        >
          <Button asChild>
            <Link href="/mypage/create-workspace">
              <Plus className="mr-2 h-4 w-4" />
              ワークスペースを作成
            </Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  // Pattern B: Invitations only
  if (!hasWorkspaces && hasInvitations) {
    return (
      <div>
        <PageHeader
          title="招待が届いています"
          description="招待を承認してワークスペースに参加するか、新しいワークスペースを作成してください"
        />
        <InvitationsList invitations={invitations} />
        <div className="mt-8 text-center">
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

  // Pattern C & D: Has workspaces
  return (
    <div>
      <PageHeader
        title={workspaces.length === 1 ? "あなたのワークスペース" : "ワークスペースを選択"}
        description={
          workspaces.length === 1
            ? "ワークスペースに入るか、招待を承認してください"
            : "続けるワークスペースを選択するか、新しいワークスペースを作成してください"
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} />
        ))}
      </div>

      {hasInvitations && (
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            📬 保留中の招待 ({invitations.length}件)
          </h2>
          <InvitationsList invitations={invitations} />
        </div>
      )}

      <div className="mt-8 text-center">
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

function WorkspaceCard({
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

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl">
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getStorageUrl(workspace.logo_url) ?? workspace.logo_url}
                alt={workspace.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{workspace.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              役割: {roleLabels[workspace.role]}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {workspace.member_count}名
              </span>
              <span className="flex items-center gap-1">
                <Tv className="h-3 w-3" />
                {workspace.program_count}つ
              </span>
            </div>
          </div>
        </div>
        <Button className="mt-4 w-full" asChild>
          <Link href={`/${workspace.slug}/dashboard`}>
            ワークスペースに入る
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function InvitationsList({
  invitations,
}: {
  invitations: Array<{
    id: string;
    workspace_name: string;
    inviter_name: string;
    role: string;
    expires_at: string;
  }>;
}) {
  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <Card key={invitation.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{invitation.workspace_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {invitation.inviter_name}からの招待 • {invitation.role}として
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    有効期限: {new Date(invitation.expires_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">承認する</Button>
                <Button size="sm" variant="outline">
                  辞退する
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
