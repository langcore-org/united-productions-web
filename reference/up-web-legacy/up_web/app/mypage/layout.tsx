import { redirect } from "next/navigation";
import { MypageSidebar, MypageMobileNav } from "@/components/layout";
import { ThemeInitializer } from "@/components/settings";
import { createClient } from "@/lib/supabase/server";

export default async function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/auth/login");
  }

  // Fetch user profile from database
  const { data: userProfile } = await supabase
    .from("users")
    .select("email, display_name, avatar_url, is_system_admin")
    .eq("id", authUser.id)
    .single();

  const user = userProfile ? {
    id: authUser.id,
    email: userProfile.email,
    display_name: userProfile.display_name,
    avatar_url: userProfile.avatar_url,
    is_system_admin: userProfile.is_system_admin ?? false,
  } : {
    id: authUser.id,
    email: authUser.email ?? "",
    display_name: null,
    avatar_url: null,
    is_system_admin: false,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ThemeInitializer />
      <MypageSidebar isSystemAdmin={user.is_system_admin} user={user} className="hidden md:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center gap-3 border-b bg-background px-4">
          <MypageMobileNav isSystemAdmin={user.is_system_admin} user={user} />
          <span className="font-semibold">マイページ</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
