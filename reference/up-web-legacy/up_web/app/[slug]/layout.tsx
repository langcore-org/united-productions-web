import { redirect, notFound } from "next/navigation";
import { Sidebar, MobileNav } from "@/components/layout";
import { ThemeInitializer } from "@/components/settings";
import { createClient } from "@/lib/supabase/server";
import { getStorageUrl } from "@/lib/utils";
import type { Program, WorkspaceRole } from "@/lib/types";

async function getLayoutData(slug: string) {
  const supabase = await createClient();

  // Get current user (includes auth metadata from OAuth providers)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, email, display_name, avatar_url, is_system_admin")
    .eq("id", user.id)
    .single();

  // Get avatar from OAuth provider if not set in profile
  // Google OAuth stores picture in user_metadata.avatar_url or user_metadata.picture
  const oauthAvatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  // Get workspace by slug
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .single();

  if (!workspace) {
    notFound();
  }

  // Get user's role in this workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .single();

  // Check if user has access (is member or system admin)
  if (!membership && !userProfile?.is_system_admin) {
    notFound();
  }

  // Get programs for this workspace
  const { data: programs } = await supabase
    .from("programs")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return {
    user: userProfile
      ? {
          email: userProfile.email,
          display_name: userProfile.display_name,
          avatar_url: getStorageUrl(userProfile.avatar_url) || oauthAvatarUrl,
        }
      : null,
    workspaceName: workspace.name,
    workspaceLogoUrl: getStorageUrl(workspace.logo_url),
    programs: (programs || []) as Program[],
    userRole: (membership?.role || (userProfile?.is_system_admin ? "owner" : "member")) as WorkspaceRole,
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, workspaceName, workspaceLogoUrl, programs, userRole } = await getLayoutData(slug);

  return (
    <div className="flex h-screen overflow-hidden">
      <ThemeInitializer />
      <Sidebar
        workspaceSlug={slug}
        workspaceName={workspaceName}
        workspaceLogoUrl={workspaceLogoUrl}
        programs={programs}
        userRole={userRole}
        user={user}
        className="hidden md:flex"
      />
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center gap-3 border-b bg-background px-4">
          <MobileNav
            workspaceSlug={slug}
            workspaceName={workspaceName}
            workspaceLogoUrl={workspaceLogoUrl}
            programs={programs}
            userRole={userRole}
            user={user}
          />
          <span className="font-semibold truncate">{workspaceName || slug}</span>
        </header>
        <main className="relative flex-1 min-h-0 overflow-hidden bg-muted/30">
          <div className="absolute inset-0 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
