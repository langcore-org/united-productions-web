import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

export default async function SystemAdminUsersPage() {
  const supabase = await createClient();

  // Check if user is system admin
  const { data: { user: authUser } } = await supabase.auth.getUser();
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

  // Fetch all users
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, display_name, avatar_url, is_system_admin, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <UsersTable
      users={users ?? []}
      totalCount={users?.length ?? 0}
    />
  );
}
