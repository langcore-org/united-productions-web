import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspacesTable } from "./workspaces-table";

export default async function SystemAdminWorkspacesPage() {
  const supabase = await createClient();

  // Check if user is system admin
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/auth/login");
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("is_system_admin")
    .eq("id", authUser.id)
    .single();

  if (!currentUser?.is_system_admin) {
    redirect("/mypage");
  }

  // Fetch workspaces
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, slug, description, logo_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (wsError) {
    console.error("Error fetching workspaces:", wsError);
  }

  // Fetch all workspace members
  const { data: allMembers } = await supabase
    .from("workspace_members")
    .select("workspace_id");

  // Fetch program counts per workspace
  const { data: allPrograms } = await supabase
    .from("programs")
    .select("id, workspace_id");

  // Transform the data to include computed fields
  const transformedWorkspaces =
    workspaces?.map((ws) => {
      const members = allMembers?.filter((m) => m.workspace_id === ws.id) || [];
      const programs = allPrograms?.filter((p) => p.workspace_id === ws.id) || [];

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        logo_url: ws.logo_url,
        memberCount: members.length,
        programCount: programs.length,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
      };
    }) ?? [];

  return (
    <WorkspacesTable
      workspaces={transformedWorkspaces}
      totalCount={transformedWorkspaces.length}
    />
  );
}
